import { toIsoDate } from "./dates.js";
import { createId, normalizeText, matchesIngredient } from "./utils.js";
import { DEFAULT_SHELF_LIFE } from "./constants.js";

// Build a pantry item object from form state
export function buildPantryItem(formState) {
	return {
		id: createId("pantry"),
		name: formState.name.trim(),
		quantity: formState.quantity,
		addedAt: formState.addedAt ?? toIsoDate(new Date()),
		shelfLifeDays: DEFAULT_SHELF_LIFE,
	};
}

// Convert a queued item into a pantry item object
export function buildPantryItemFromQueuedItem(item) {
	return {
		id: createId("pantry"),
		name: item.name.trim(),
		quantity: item.quantity,
		addedAt: item.addedAt,
		expiryDays: item.expiryDays ?? null,
		shelfLifeDays: DEFAULT_SHELF_LIFE,
	};
}

// Build a shopping list from the meal plan, excluding pantry items
export function buildShoppingList(plan, pantryItems) {
	const pantryNames = pantryItems.map((item) => item.name);
	const listMap = new Map();

	Object.values(plan).forEach((mealOrMeals) => {
		const meals = Array.isArray(mealOrMeals) ? mealOrMeals : [mealOrMeals];

		// For each meal (or each meal in an array), inspect ingredients
		meals.forEach((meal) => {
			if (!meal?.ingredients?.length) {
				return;
			}

			meal.ingredients.forEach((ingredient) => {
				// Skip ingredients already covered by pantry
				const alreadyHaveIt = pantryNames.some((pantryName) =>
					matchesIngredient(pantryName, ingredient.name),
				);

				if (alreadyHaveIt) {
					return;
				}

				// Normalize ingredient name to use as key
				const key = normalizeText(ingredient.name);
				const current = listMap.get(key) ?? {
					id: key,
					name: ingredient.name,
					measure: ingredient.measure,
					sources: [],
					checked: false,
				};

				// Record which meals require this ingredient (deduplicated)
				current.sources = Array.from(
					new Set([...current.sources, meal.strMeal]),
				);
				listMap.set(key, current);
			});
		});
	});

	return Array.from(listMap.values()).sort((left, right) =>
		left.name.localeCompare(right.name),
	);
}

// Return fallback suggestions (empty by default)
export function buildMealSuggestionFallbacks() {
	return [];
}

// Build a normalized recipe object from a generated meal
export function buildRecipeFromMeal(meal) {
	if (!meal || !meal.name) return null;

	return {
		id: `recipe-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
		name: meal.name || meal.strMeal || "Untitled",
		ingredients: Array.isArray(meal.ingredients)
			? meal.ingredients.map((ing) => ({
					name: ing.name || ing,
					measure: ing.measure || "",
				}))
			: [],
		shopping: Array.isArray(meal.shopping) ? meal.shopping : [],
		note: meal.note || "",
		servings: meal.servings || 1,
		timeMinutes: meal.timeMinutes || null,
	};
}
