import React from "react";
import { ChecklistItem } from "./UIElements";

export function ShoppingListPage({
	shoppingList,
	pantryItems,
	mealPlan,
	onToggleItem,
}) {
	const remainingCount = shoppingList.filter((item) => !item.checked).length;

	return (
		<main className="page-grid">
			<section className="card shopping-panel full-width">
				<div className="section-heading">
					<h3>Shopping list</h3>
					<p>
						The checklist compares planned meals against what is
						already in your pantry.
					</p>
				</div>

				<div className="shopping-summary">
					<span>{Object.keys(mealPlan).length} planned meals</span>
					<span>{pantryItems.length} pantry items</span>
					<span>{remainingCount} items left to buy</span>
				</div>

				<div className="shopping-list">
					{shoppingList.length ? (
						shoppingList.map((item) => (
							<ChecklistItem
								key={item.id}
								item={item}
								onToggle={() => onToggleItem(item.id)}
							/>
						))
					) : (
						<p className="muted-copy">
							Plan a few meals first. The shopping list will fill
							with only the ingredients that are missing from your
							pantry.
						</p>
					)}
				</div>
			</section>
		</main>
	);
}
