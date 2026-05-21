import React from "react";
import {
	isItemAvailableOn,
	getExpiryDate,
	formatFriendlyDate,
	toIsoDate,
} from "../modules/pantry-logic";

export function PantryTimelinePage({
	pantryItems,
	upcomingDays,
	expiringSoon,
}) {
	return (
		<main className="page-grid">
			<section className="card timeline-panel full-width">
				<div className="section-heading">
					<h3>Pantry timeline</h3>
					<p>
						Each card checks what is still valid from the day it was
						added through the next 7 days.
					</p>
				</div>

				{expiringSoon.length ? (
					<div className="warning-banner warning-banner-inline">
						{expiringSoon.map((item) => (
							<span key={item.id}>
								Use {item.name} by <br />{" "}
								{formatFriendlyDate(toIsoDate(item.expiryDate))}
							</span>
						))}
					</div>
				) : null}

				<div className="timeline-grid">
					{upcomingDays.map((day) => {
						const availableItems = pantryItems.filter((item) =>
							isItemAvailableOn(item, day.date),
						);

						return (
							<article className="timeline-card" key={day.iso}>
								<div className="section-heading compact">
									<h4>{day.label}</h4>
									<p>{day.fullLabel}</p>
								</div>

								<strong>
									{availableItems.length} items available
								</strong>
								<ul>
									{availableItems.map((item) => (
										<li key={`${day.iso}-${item.id}`}>
											{item.name} until{" "}
											{formatFriendlyDate(
												toIsoDate(getExpiryDate(item)),
											)}
										</li>
									))}
								</ul>
							</article>
						);
					})}
				</div>
			</section>
		</main>
	);
}
