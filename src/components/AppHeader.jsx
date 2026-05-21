import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

export function AppHeader({ pantryItems, onSeedPlanner, openaiKey, onSetOpenaiKey }) {
	const location = useLocation();
	const [showKeyInput, setShowKeyInput] = useState(false);
	const [keyInput, setKeyInput] = useState(openaiKey);

	useEffect(() => {
		setKeyInput(openaiKey);
	}, [openaiKey]);

	function handleSaveKey() {
		if (keyInput.trim()) {
			onSetOpenaiKey(keyInput.trim());
			setShowKeyInput(false);
		}
	}

	const routeCopy = {
		"/": "Plan meals around the groceries already in your kitchen.",
		"/groceries": "Add produce once and let shelf life do the tracking.",
		"/timeline": "See what stays useful today and what needs to move fast.",
		"/planner":
			"Turn pantry items into a 7-day meal plan with AI-powered meal ideas.",
		"/shopping": "Buy only the gap between your pantry and your plan.",
	};

	return (
		<header className="topbar">
			<div>
				<p className="eyebrow">DGMD-28 Final Project</p>
				<h1>Pantry Smart Planner</h1>
				<p className="lede">
					{routeCopy[location.pathname] ?? routeCopy["/"]}
				</p>
			</div>

			<div className="topbar-actions">
				<div className="quick-stat">
					<span>{pantryItems.length}</span>
					<small>stored groceries</small>
				</div>

				{showKeyInput ? (
					<div className="key-input-group">
						<input
							type="password"
							value={keyInput}
							onChange={(e) => setKeyInput(e.target.value)}
							placeholder="sk-..."
							className="key-input"
						/>
						<button
							className="text-button"
							onClick={handleSaveKey}
							type="button"
						>
							Save
						</button>
						<button
							className="text-button subtle"
							onClick={() => setShowKeyInput(false)}
							type="button"
						>
							Cancel
						</button>
					</div>
				) : (
					<>
						<button
							className="ghost-button"
							onClick={() => setShowKeyInput(true)}
							type="button"
							title={
								openaiKey
									? "OpenAI API key set"
									: "Set OpenAI API key"
							}
						>
							{openaiKey ? "✓ API key set" : "Set API key"}
						</button>
					</>
				)}
			</div>

			<nav className="main-nav" aria-label="Primary">
				<NavLink to="/" end>
					Dashboard
				</NavLink>
				<NavLink to="/groceries">Add groceries</NavLink>
				<NavLink to="/timeline">Pantry tracker</NavLink>
				<NavLink to="/planner">Weekly meal planner</NavLink>
				<NavLink to="/shopping">Shopping list</NavLink>
			</nav>
		</header>
	);
}
