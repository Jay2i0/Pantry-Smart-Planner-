import React from "react";
import { Link } from "react-router-dom";

export function OverviewPage({ pantryStats }) {
	return (
		<main className="page-grid overview-grid">
			<section className="hero-panel card full-width">
				<div className="hero-copy">
					<p className="section-label">
						Waste less. Cook earlier. Shop smarter.
					</p>
					<h2>
						Keep produce from disappearing in the back of the
						fridge.
					</h2>
					<p>
						Pantry Smart Planner tracks what you bought, flags what
						is about to expire, and turns the inventory into a week
						of meal ideas and a precise shopping list.
					</p>
					<div className="hero-actions">
						<Link className="primary-button" to="/groceries">
							Add groceries
						</Link>
					</div>
				</div>

				<div className="hero-stats">
					{pantryStats.map((stat) => (
						<article className="stat-card" key={stat.label}>
							<strong>{stat.value}</strong>
							<span>{stat.label}</span>
						</article>
					))}
				</div>
			</section>

		</main>
	);
}
