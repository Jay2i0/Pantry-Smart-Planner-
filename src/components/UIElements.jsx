import React from "react";

export function MealCard({
	meal,
	onAssign,
	actionLabel = "Assign",
	dense = false,
	onSecondaryAction,
	secondaryActionLabel,
	onGenerateRecipe,
}) {
	return (
		<article className={`meal-card ${dense ? "dense" : ""}`}>
			{meal.strMealThumb ? (
				<img
					alt={meal.strMeal}
					className="meal-thumb"
					src={meal.strMealThumb}
				/>
			) : (
				<div className="meal-thumb placeholder">
					<span>{meal.strMeal.slice(0, 2).toUpperCase()}</span>
				</div>
			)}

			<div className="meal-card-body">
				<h4>{meal.strMeal}</h4>
				<div className="ingredient-pills">
					{meal.ingredients.slice(0, 3).map((ingredient) => (
						<span key={`${meal.idMeal}-${ingredient.name}`}>
							{ingredient.name}
						</span>
					))}
				</div>
				<div className="meal-card-actions">
					{onAssign ? (
						<button
							className="text-button"
							onClick={onAssign}
							type="button"
						>
							{actionLabel}
						</button>
					) : null}
					{onSecondaryAction ? (
						<button
							className="text-button subtle"
							onClick={onSecondaryAction}
							type="button"
						>
							{secondaryActionLabel ?? "Secondary action"}
						</button>
					) : null}
					{onGenerateRecipe ? (
						<button
							className="text-button"
							onClick={onGenerateRecipe}
							type="button"
							title="View or generate recipe instructions"
						>
							🍳 Recipe
						</button>
					) : null}
				</div>
			</div>
		</article>
	);
}

export function ChecklistItem({ item, onToggle }) {
	return (
		<label className={`checklist-item ${item.checked ? "checked" : ""}`}>
			<input checked={item.checked} onChange={onToggle} type="checkbox" />
			<div>
				<strong>{item.name}</strong>
				<p>
					{item.measure} • Needed for {item.sources.join(", ")}
				</p>
			</div>
		</label>
	);
}
