import React, { useState } from "react";
import { MealCard } from "./UIElements";
import { fetchCookingInstructionsForMeals } from "../modules/pantry-logic";

export function WeeklyMealPlannerPage({
	selectedDays,
	setSelectedDays,
	upcomingDays,
	mealSuggestions,
	suggestionsError,
	pantryItems,
	mealPlan,
	openaiKey,
	onSuggestMeals,
	onPickSuggestion,
	onClearAssignment,
	onSeedPlanner,
}) {
	const selectedDaySet = new Set(selectedDays);
	const selectedMealDays = upcomingDays.filter((day) =>
		selectedDaySet.has(day.iso),
	);

	const [recipeModal, setRecipeModal] = useState(null);
	const [isGenerating, setIsGenerating] = useState(false);

	async function handleGenerateClick() {
		setIsGenerating(true);
		try {
			await onSeedPlanner();
		} finally {
			setIsGenerating(false);
		}
	}

	async function handleGenerateRecipe(meal) {
		if (!meal) return;
		if (!openaiKey) {
			alert("Please set OpenAI key in settings to generate recipes.");
			return;
		}
		setRecipeModal({ loading: true, meal, steps: null, error: null });
		try {
			const results = await fetchCookingInstructionsForMeals(
				meal,
				openaiKey,
				1500,
			);
			const item = Array.isArray(results) ? results[0] : results;
			// Normalize steps: remove leading numbering or bullets to avoid double numbers
			const rawSteps = item?.instructions || [];
			const cleaned = rawSteps.map((s) =>
				String(s)
					.trim()
					// remove leading numeric lists like "1.", "1)", "1 -"
					.replace(/^\s*\d+\s*[\.)\-:]\s*/, "")
					// remove leading bullets like "-", "•"
					.replace(/^[\u2022\-\*]\s*/, ""),
			);

			setRecipeModal({
				loading: false,
				meal,
				steps: cleaned,
				error: null,
			});
		} catch (err) {
			setRecipeModal({
				loading: false,
				meal,
				steps: null,
				error: err.message,
			});
		}
	}

	function togglePlannerDay(dayIso) {
		setSelectedDays((currentDays) => {
			const isSelected = currentDays.includes(dayIso);

			if (isSelected) {
				if (currentDays.length <= 2) {
					return currentDays;
				}

				return currentDays.filter((day) => day !== dayIso);
			}

			if (currentDays.length >= 7) {
				return currentDays;
			}

			return [...currentDays, dayIso].sort();
		});
	}

	return (
		<main className="page-grid planner-grid">
			<section className="card planner-panel full-width">
				<div className="section-heading">
					<h3>Weekly meal planner</h3>
					<p>
						Pick between 2 and 7 days, then load OpenAI meal ideas
						based on what is already in the pantry.
					</p>
				</div>

				<div className="planner-toolbar">
					<div className="pill-group">
						{upcomingDays.map((day) => (
							<button
								className={`day-pill ${selectedDaySet.has(day.iso) ? "active" : ""}`}
								key={day.iso}
								onClick={() => togglePlannerDay(day.iso)}
								type="button"
							>
								{day.label}
							</button>
						))}
					</div>

					<div className="planner-actions">
						<button
							className="ghost-button"
							onClick={handleGenerateClick}
							type="button"
							disabled={isGenerating}
						>
							{isGenerating ? "Generating..." : "Generate meals"}
						</button>
					</div>
				</div>

				<p className="muted-copy">
					{selectedMealDays.length} days selected. Select at least 2
					days and no more than 7.
				</p>

				{suggestionsError ? (
					<p className="notice-text">{suggestionsError}</p>
				) : null}

				<div className="planner-days">
					{selectedMealDays.map((day) => (
						<article className="planner-day-card" key={day.iso}>
							<div className="section-heading compact">
								<h4>{day.label}</h4>
								<p>{day.fullLabel}</p>
							</div>

							{(() => {
								const slotLabels = [
									"Breakfast",
									"Lunch",
									"Dinner",
								];
								const dayMeals = Array.isArray(
									mealPlan[day.iso],
								)
									? [...mealPlan[day.iso]]
									: [mealPlan[day.iso], null, null];

								while (dayMeals.length < 3) dayMeals.push(null);

								return slotLabels.map((label, slotIndex) => (
									<div
										key={`${day.iso}-${slotIndex}`}
										className="planner-slot"
									>
										<strong>{label}</strong>

										{dayMeals[slotIndex] ? (
											<MealCard
												meal={dayMeals[slotIndex]}
												onSecondaryAction={() =>
													onClearAssignment(
														day.iso,
														slotIndex,
													)
												}
												secondaryActionLabel={`Clear ${label}`}
												onGenerateRecipe={() =>
													handleGenerateRecipe(
														dayMeals[slotIndex],
													)
												}
												dense
											/>
										) : (
											<label>
												<select
													value=""
													onChange={(event) => {
														const meal =
															mealSuggestions.find(
																(item) =>
																	item.idMeal ===
																	event.target
																		.value,
															);

														if (meal) {
															onPickSuggestion(
																day.iso,
																meal,
																slotIndex,
															);
														}
													}}
												>
													<option value="">
														Choose from ideas...
													</option>
													{mealSuggestions.map(
														(meal) => (
															<option
																key={
																	meal.idMeal
																}
																value={
																	meal.idMeal
																}
															>
																{meal.strMeal}
															</option>
														),
													)}
												</select>
											</label>
										)}
									</div>
								));
							})()}
						</article>
					))}
				</div>

				<div className="suggestion-strip">
					{mealSuggestions.map((meal) => (
						<MealCard
							key={meal.idMeal}
							meal={meal}
							onAssign={() => {
								for (const d of selectedMealDays) {
									const dayMeals = Array.isArray(
										mealPlan[d.iso],
									)
										? [...mealPlan[d.iso]]
										: [mealPlan[d.iso], null, null];
									while (dayMeals.length < 3)
										dayMeals.push(null);
									const nextSlot = dayMeals.findIndex(
										(m) => !m,
									);
									if (nextSlot !== -1) {
										onPickSuggestion(d.iso, meal, nextSlot);
										break;
									}
								}
							}}
							actionLabel="Use in planner"
							onGenerateRecipe={() => handleGenerateRecipe(meal)}
						/>
					))}
				</div>
			</section>

			{recipeModal ? (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: 20,
						zIndex: 1000,
					}}
					onClick={() => setRecipeModal(null)}
				>
					<div
						style={{
							background: "white",
							borderRadius: 8,
							padding: 24,
							maxWidth: 600,
							width: "100%",
							maxHeight: "80vh",
							overflowY: "auto",
							boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<h3 style={{ marginTop: 0, marginBottom: 16 }}>
							{recipeModal.meal.strMeal || recipeModal.meal.name}
						</h3>

						{recipeModal.loading ? (
							<p>Generating recipe instructions...</p>
						) : recipeModal.error ? (
							<p style={{ color: "var(--danger)" }}>
								{recipeModal.error}
							</p>
						) : recipeModal.steps &&
						  recipeModal.steps.length > 0 ? (
							<ol style={{ lineHeight: 1.6, paddingLeft: 24 }}>
								{recipeModal.steps.map((step, idx) => (
									<li key={idx} style={{ marginBottom: 8 }}>
										{step}
									</li>
								))}
							</ol>
						) : (
							<p>Could not generate instructions.</p>
						)}

						<div style={{ textAlign: "right", marginTop: 24 }}>
							<button
								className="primary-button"
								onClick={() => setRecipeModal(null)}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
