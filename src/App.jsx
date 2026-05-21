import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import {
	STORAGE_KEYS,
	DEFAULT_PANTRY,
	DEFAULT_RECIPES,
	useLocalStorageState,
	getTodayStart,
	addDays,
	toIsoDate,
	formatDateLabel,
	formatLongDate,
	getExpiryDate,
	buildShoppingList,
	normalizeText,
	fetchMealSuggestionsFromPantry,
	buildMealSuggestionFallbacks,
	buildPantryItem,
	buildRecipeFromMeal,
} from "./modules/pantry-logic";

import { AppHeader } from "./components/AppHeader";
import { OverviewPage } from "./components/OverviewPage";
import { AddGroceriesPage } from "./components/AddGroceriesPage";
import { PantryTimelinePage } from "./components/PantryTimelinePage";
import { WeeklyMealPlannerPage } from "./components/WeeklyMealPlannerPage";
import { ShoppingListPage } from "./components/ShoppingListPage";

function App() {
	const [pantryItems, setPantryItems] = useLocalStorageState(
		STORAGE_KEYS.pantry,
		DEFAULT_PANTRY,
	);
	const [shoppingList, setShoppingList] = useLocalStorageState(
		STORAGE_KEYS.shopping,
		[],
	);
	const [mealPlan, setMealPlan] = useLocalStorageState(STORAGE_KEYS.plan, {});
	const [openaiKey, setOpenaiKey] = useLocalStorageState(
		STORAGE_KEYS.openaiKey,
		"",
	);
	const [mealSuggestions, setMealSuggestions] = useLocalStorageState(
		STORAGE_KEYS.suggestions,
		[],
	);
	const [recipes, setRecipes] = useLocalStorageState(
		STORAGE_KEYS.recipes,
		DEFAULT_RECIPES,
	);
	const [suggestionsError, setSuggestionsError] = useState("");
	const [selectedDays, setSelectedDays] = useState(() => {
		const today = getTodayStart();
		return [0, 1, 2, 3, 4, 5, 6].map((offset) =>
			toIsoDate(addDays(today, offset)),
		);
	});

	const upcomingDays = useMemo(() => {
		const today = getTodayStart();
		return Array.from({ length: 7 }, (_, index) => {
			const date = addDays(today, index);
			return {
				iso: toIsoDate(date),
				label: formatDateLabel(date),
				fullLabel: formatLongDate(date),
				date,
			};
		});
	}, []);

	const expiringSoon = useMemo(() => {
		const today = getTodayStart();
		const warningDate = addDays(today, 7);

		return pantryItems
			.map((item) => ({
				...item,
				expiryDate: getExpiryDate(item),
			}))
			.filter(
				(item) =>
					item.expiryDate >= today && item.expiryDate <= warningDate,
			)
			.sort((left, right) => left.expiryDate - right.expiryDate);
	}, [pantryItems]);

	const pantryStats = useMemo(() => {
		const plannedMeals = Object.values(mealPlan).reduce((sum, entry) => {
			if (Array.isArray(entry)) return sum + entry.filter(Boolean).length;
			return sum + (entry ? 1 : 0);
		}, 0);

		return [
			{ label: "Pantry items", value: pantryItems.length },
			{ label: "Planned meals", value: plannedMeals },
			{ label: "Shopping checks", value: shoppingList.length },
		];
	}, [mealPlan, pantryItems.length, shoppingList.length]);

	useEffect(() => {
		const derivedShoppingList = buildShoppingList(mealPlan, pantryItems);

		setShoppingList((previousList) => {
			const previousChecks = new Map(
				previousList.map((item) => [
					normalizeText(item.name),
					item.checked,
				]),
			);

			return derivedShoppingList.map((item) => ({
				...item,
				checked: previousChecks.get(normalizeText(item.name)) ?? false,
			}));
		});
	}, [mealPlan, pantryItems, setShoppingList]);

	async function handleFetchSuggestions(
		seedItems = pantryItems,
		desiredCount = 8,
	) {
		setSuggestionsError("");

		try {
			const suggestions = await fetchMealSuggestionsFromPantry(
				seedItems,
				openaiKey,
				desiredCount,
			);
			setMealSuggestions(suggestions);
			return suggestions;
		} catch (error) {
			const fallbacks = buildMealSuggestionFallbacks();
			setMealSuggestions(fallbacks);
			setSuggestionsError(
				`${error.message}. Showing demo suggestions instead.`,
			);
			return fallbacks;
		}
	}

	function addPantryItem(formState) {
		const nextItem = formState.id ? formState : buildPantryItem(formState);
		setPantryItems((currentItems) => [nextItem, ...currentItems]);
	}

	function updateMealAssignment(dateIso, meal, slotIndex = 0) {
		setMealPlan((currentPlan) => {
			const nextPlan = { ...currentPlan };
			const currentDay = Array.isArray(nextPlan[dateIso])
				? [...nextPlan[dateIso]]
				: [null, null, null];

			currentDay[slotIndex] = meal;
			nextPlan[dateIso] = currentDay;
			return nextPlan;
		});
	}

	function clearMealAssignment(dateIso, slotIndex) {
		setMealPlan((currentPlan) => {
			const nextPlan = { ...currentPlan };

			if (slotIndex === undefined) {
				delete nextPlan[dateIso];
				return nextPlan;
			}

			const currentDay = Array.isArray(nextPlan[dateIso])
				? [...nextPlan[dateIso]]
				: [null, null, null];

			currentDay[slotIndex] = null;

			if (currentDay.every((m) => !m)) {
				delete nextPlan[dateIso];
			} else {
				nextPlan[dateIso] = currentDay;
			}

			return nextPlan;
		});
	}

	function updateShoppingCheck(itemId) {
		setShoppingList((currentItems) =>
			currentItems.map((item) =>
				item.id === itemId ? { ...item, checked: !item.checked } : item,
			),
		);
	}

	async function seedPlannerWithSuggestions() {
		const selectedPlanDays =
			selectedDays.length >= 2
				? selectedDays
				: upcomingDays.slice(0, 7).map((day) => day.iso);

		if (selectedDays.length < 2) {
			setSelectedDays(selectedPlanDays);
		}

		const totalNeeded = selectedPlanDays.length * 3 + 3; // 3 meals/day + 3 extras

		const suggestions = await handleFetchSuggestions(
			undefined,
			totalNeeded,
		);

		if (!suggestions || !suggestions.length) {
			return;
		}

		setMealPlan((currentPlan) => {
			const nextPlan = { ...currentPlan };
			let suggestionIndex = 0;

			selectedPlanDays.forEach((dayIso) => {
				const dayMeals = [null, null, null];

				for (let slot = 0; slot < 3; slot++) {
					dayMeals[slot] =
						suggestions[suggestionIndex % suggestions.length];
					suggestionIndex += 1;
				}

				nextPlan[dayIso] = dayMeals;
			});

			return nextPlan;
		});
	}

	return (
		<BrowserRouter>
			<div className="app-shell">
				<AppHeader
					pantryItems={pantryItems}
					onSeedPlanner={seedPlannerWithSuggestions}
					openaiKey={openaiKey}
					onSetOpenaiKey={setOpenaiKey}
				/>
				<Routes>
					<Route
						path="/"
						element={<OverviewPage pantryStats={pantryStats} />}
					/>
					<Route
						path="/groceries"
						element={
							<AddGroceriesPage
								pantryItems={pantryItems}
								onAddPantryItem={addPantryItem}
								onRemovePantryItem={(itemId) =>
									setPantryItems((currentItems) =>
										currentItems.filter(
											(item) => item.id !== itemId,
										),
									)
								}
								openaiKey={openaiKey}
							/>
						}
					/>
					<Route
						path="/timeline"
						element={
							<PantryTimelinePage
								pantryItems={pantryItems}
								upcomingDays={upcomingDays}
								expiringSoon={expiringSoon}
							/>
						}
					/>
					<Route
						path="/planner"
						element={
							<WeeklyMealPlannerPage
								selectedDays={selectedDays}
								setSelectedDays={setSelectedDays}
								upcomingDays={upcomingDays}
								mealSuggestions={mealSuggestions}
								suggestionsError={suggestionsError}
								pantryItems={pantryItems}
								mealPlan={mealPlan}
								recipes={recipes}
								onSaveRecipe={saveRecipe}
								openaiKey={openaiKey}
								onSuggestMeals={handleFetchSuggestions}
								onPickSuggestion={updateMealAssignment}
								onClearAssignment={clearMealAssignment}
								onSeedPlanner={seedPlannerWithSuggestions}
							/>
						}
					/>
					<Route
						path="/shopping"
						element={
							<ShoppingListPage
								shoppingList={shoppingList}
								pantryItems={pantryItems}
								mealPlan={mealPlan}
								onToggleItem={updateShoppingCheck}
							/>
						}
					/>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</div>
		</BrowserRouter>
	);
}

function saveRecipe(recipe) {
	const next = recipe.id
		? recipe
		: {
				...recipe,
				id: `recipe-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
			};
	setRecipes((current) => [next, ...current]);
}

export default App;
