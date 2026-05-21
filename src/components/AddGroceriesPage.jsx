import React, { useState, useEffect } from "react";
import {
	createId,
	toIsoDate,
	getTodayStart,
	normalizeExpiryDays,
	parseJsonContent,
	buildPantryItemFromQueuedItem,
	getExpiryDate,
	formatFriendlyDate,
	DEFAULT_SHELF_LIFE,
} from "../modules/pantry-logic";

export function AddGroceriesPage({
	pantryItems,
	onAddPantryItem,
	onRemovePantryItem,
	openaiKey,
}) {
	const [name, setName] = useState("");
	const [quantityNumber, setQuantityNumber] = useState("1");
	const [quantityUnit, setQuantityUnit] = useState("item(s)");
	const [receiptProcessing, setReceiptProcessing] = useState(false);
	const [receiptError, setReceiptError] = useState("");
	const [pendingItems, setPendingItems] = useState([]);

	const QUANTITY_UNITS = [
		"item(s)",
		"bunch",
		"bunches",
		"lb",
		"lbs",
		"kg",
		"jar",
		"jars",
	];

	const quantity = `${quantityNumber} ${quantityUnit}`;

	const previewShelfLife = DEFAULT_SHELF_LIFE;

	useEffect(() => {
		if (openaiKey?.trim()) {
			setReceiptError("");
		}
	}, [openaiKey]);

	function queueManualItem(event) {
		event.preventDefault();

		if (!name.trim() || !quantityNumber.trim()) {
			return;
		}

		setPendingItems((currentItems) => [
			...currentItems,
			{
				id: createId("pending"),
				name: name.trim(),
				quantity,
			},
		]);
		setName("");
		setQuantityNumber("1");
		setQuantityUnit("item(s)");
	}

	function addPendingItemsToPantry() {
		if (!pendingItems.length) {
			return;
		}

		const addedAt = toIsoDate(new Date());

		pendingItems.forEach((item) => {
			onAddPantryItem(
				buildPantryItemFromQueuedItem({
					...item,
					addedAt,
				}),
			);
		});

		setPendingItems([]);
	}

	function removePendingItem(itemId) {
		setPendingItems((currentItems) =>
			currentItems.filter((item) => item.id !== itemId),
		);
	}

	async function handleReceiptUpload(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!openaiKey?.trim()) {
			setReceiptError(
				"Please set your OpenAI API key to use receipt scanning.",
			);
			return;
		}

		setReceiptProcessing(true);
		setReceiptError("");

		try {
			const reader = new FileReader();

			const imageBase64 = await new Promise((resolve, reject) => {
				reader.onload = () => {
					const result = reader.result;
					if (typeof result === "string") {
						resolve(result.split(",")[1]);
					} else {
						reject(new Error("Failed to read image"));
					}
				};
				reader.onerror = () => reject(new Error("File read error"));
				reader.readAsDataURL(file);
			});

			const response = await fetch(
				"https://api.openai.com/v1/chat/completions",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${openaiKey.trim()}`,
					},
					body: JSON.stringify({
						model: "gpt-4o",
						messages: [
							{
								role: "user",
								content: [
									{
										type: "text",
										text: `Extract all grocery items from this receipt. Today is ${toIsoDate(getTodayStart())}. Return ONLY a valid JSON array with items. Each item must have: "name" (item name), "quantity" (number), "unit" (measurement unit like "item", "lb", "kg", etc), and "expiryDays" (an integer number of days from today until it should be used, based on this receipt and today's date). If unsure, estimate conservatively for expiryDays. Return ONLY the JSON array, nothing else.`,
									},
									{
										type: "image_url",
										image_url: {
											url: `data:${file.type || "image/jpeg"};base64,${imageBase64}`,
										},
									},
								],
							},
						],
						temperature: 0.3,
						max_tokens: 1000,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || "Vision API request failed",
				);
			}

			const data = await response.json();
			const content = data.choices?.[0]?.message?.content;

			if (!content) {
				throw new Error("No response from receipt parser.");
			}

			const parsedItems = parseJsonContent(content);

			if (!Array.isArray(parsedItems) || !parsedItems.length) {
				throw new Error("No items found on receipt.");
			}

			const queuedReceiptItems = parsedItems
				.filter((item) => item.name?.trim() && item.quantity)
				.map((item) => ({
					id: createId("receipt"),
					name: item.name.trim(),
					quantity: `${item.quantity} ${item.unit || "item(s)"}`,
					expiryDays:
						normalizeExpiryDays(
							item.expiryDays ?? item.expiryDate,
						) ?? 7,
				}));

			setPendingItems((currentItems) => [
				...currentItems,
				...queuedReceiptItems,
			]);

			setReceiptError("");
			alert(`Queued ${queuedReceiptItems.length} items from receipt!`);
		} catch (error) {
			console.error("Receipt parsing error:", error);
			setReceiptError(
				`Receipt scanning failed: ${error.message}. Please try manually adding items.`,
			);
		} finally {
			setReceiptProcessing(false);
			event.target.value = ""; // Reset input
		}
	}

	return (
		<main className="page-grid">
			<section className="card form-panel">
				<div className="section-heading">
					<h3>Add groceries</h3>
					<p>Log the fresh items as soon as you get home.</p>
				</div>

				{receiptError && (
					<div
						style={{
							padding: "12px 14px",
							backgroundColor: "#ffe0e0",
							border: "1px solid #ff6b6b",
							borderRadius: "8px",
							color: "#c92a2a",
							marginBottom: "12px",
							fontSize: "0.9rem",
						}}
					>
						{receiptError}
					</div>
				)}

				<label
					style={{
						display: "block",
						padding: "16px",
						borderRadius: "12px",
						backgroundColor: "rgba(232, 245, 239, 0.5)",
						border: "2px dashed var(--accent)",
						cursor: "pointer",
						textAlign: "center",
						marginBottom: "16px",
						transition: "all 160ms ease",
					}}
				>
					<input
						type="file"
						accept="image/*"
						onChange={handleReceiptUpload}
						disabled={receiptProcessing}
						style={{ display: "none" }}
					/>
					<div style={{ pointerEvents: "none" }}>
						<div
							style={{
								fontSize: "1.8rem",
								marginBottom: "6px",
							}}
						>
							📸
						</div>
						<strong>
							{receiptProcessing
								? "Scanning receipt..."
								: "Upload a photo of your receipt"}
						</strong>
						<p
							style={{
								fontSize: "0.85rem",
								color: "var(--muted)",
								marginTop: "4px",
							}}
						>
							Click to upload or drag a receipt image
						</p>
					</div>
				</label>

				<div
					style={{
						margin: "12px 0",
						padding: "8px 0",
						borderTop: "1px solid var(--border)",
						borderBottom: "1px solid var(--border)",
						textAlign: "center",
						fontSize: "0.85rem",
						color: "var(--muted)",
					}}
				>
					or enter manually
				</div>

				<form className="pantry-form" onSubmit={queueManualItem}>
					<label>
						Item name
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Tomatoes, spinach, strawberries..."
							type="text"
						/>
					</label>

					<div
						style={{
							display: "flex",
							gap: "8px",
							alignItems: "flex-end",
						}}
					>
						<label style={{ flex: "0 1 60px" }}>
							Number
							<input
								value={quantityNumber}
								onChange={(event) =>
									setQuantityNumber(event.target.value)
								}
								type="number"
								min="1"
								placeholder="1"
							/>
						</label>
						<label style={{ flex: 1 }}>
							Unit
							<select
								value={quantityUnit}
								onChange={(event) =>
									setQuantityUnit(event.target.value)
								}
							>
								{QUANTITY_UNITS.map((unit) => (
									<option key={unit} value={unit}>
										{unit}
									</option>
								))}
							</select>
						</label>
					</div>

					<div className="shelf-life-pill">
						Shelf life set to about {previewShelfLife} day
						{previewShelfLife === 1 ? "" : "s"}
					</div>

					<button className="primary-button" type="submit">
						Queue item
					</button>
				</form>

				{pendingItems.length ? (
					<div style={{ marginTop: "18px" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								gap: "12px",
								marginBottom: "10px",
							}}
						>
							<h4 style={{ margin: 0 }}>Queued items</h4>
							<button
								className="text-button subtle"
								type="button"
								onClick={() => setPendingItems([])}
							>
								Clear queue
							</button>
						</div>

						<div className="pantry-list">
							{pendingItems.map((item) => (
								<article className="pantry-item" key={item.id}>
									<div>
										<strong>{item.name}</strong>
										<p>{item.quantity}</p>
									</div>
									<button
										className="text-button subtle"
										type="button"
										onClick={() =>
											removePendingItem(item.id)
										}
									>
										Remove
									</button>
								</article>
							))}
						</div>
					</div>
				) : null}

				<button
					className="secondary-button"
					onClick={addPendingItemsToPantry}
					type="button"
					disabled={!pendingItems.length}
					style={{ marginTop: "12px" }}
				>
					Add to pantry ({pendingItems.length})
				</button>
			</section>

			<section className="card list-panel">
				<div className="section-heading">
					<h3>Visible pantry list</h3>
					<p>
						Items are sorted by recency, and each one carries a
						shelf life.
					</p>
				</div>

				<div className="pantry-list">
					{pantryItems.length ? (
						pantryItems.map((item) => {
							const expiryDate = getExpiryDate(item);

							return (
								<article className="pantry-item" key={item.id}>
									<div>
										<strong>{item.name}</strong>
										<p>{item.quantity}</p>
									</div>
									<div>
										<div
											style={{
												display: "grid",
												gap: "2px",
											}}
										>
											<span>
												Added{" "}
												{formatFriendlyDate(
													item.addedAt,
												)}
											</span>
											<span>
												Expires{" "}
												{formatFriendlyDate(
													toIsoDate(expiryDate),
												)}
											</span>
										</div>
									</div>
									<button
										className="text-button"
										onClick={() =>
											onRemovePantryItem(item.id)
										}
										type="button"
									>
										Remove
									</button>
								</article>
							);
						})
					) : (
						<p className="muted-copy">
							No groceries yet. Add produce above to start the
							timeline and meal planner.
						</p>
					)}
				</div>
			</section>
		</main>
	);
}
