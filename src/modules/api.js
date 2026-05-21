import { parseJsonContent } from "./utils.js";
import { buildMealSuggestionFallbacks } from "./models.js";

// Fetch cooking instructions from OpenAI; expects a JSON object with `meals` array
export async function fetchCookingInstructionsForMeals(
	meals,
	openaiKey,
	maxTokens = 1500,
) {
	const mealArray = Array.isArray(meals) ? meals : [meals];

	if (!mealArray.length) return [];

	if (!openaiKey) {
		throw new Error(
			"Please set your OpenAI API key in settings before requesting cooking instructions.",
		);
	}

	const listText = mealArray
		.map((m) => {
			const ings = Array.isArray(m.ingredients)
				? m.ingredients
						.map((i) =>
							i && i.name
								? `${i.name}${i.measure ? ` — ${i.measure}` : ""}`
								: "",
						)
						.filter(Boolean)
						.join("; ")
				: "";

			return `- ${m.name || m.strMeal || "Meal"}: ${ings}`;
		})
		.join("\n");

	const prompt = `You are a concise recipe writer. For each of the meals below, write clear step-by-step cooking instructions suitable for a home cook. Prefer short numbered steps. Include estimated time and servings when possible. Return ONLY a valid JSON object with a "meals" array property where each element is an object with: "name" (meal name), and "instructions" (an array of short step strings).\n\nMeals:\n${listText}`;

	async function doRequest(tokensLimit) {
		// Call OpenAI Chat Completions endpoint
		const resp = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${openaiKey.trim()}`,
			},
			body: JSON.stringify({
				model: "gpt-4o",
				response_format: { type: "json_object" },
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: 0.6,
				max_tokens: tokensLimit,
			}),
		});

		if (!resp.ok) {
			// Read error details from response for better message
			const errorData = await resp.json();
			throw new Error(
				errorData.error?.message || "OpenAI API request failed",
			);
		}

		return resp.json();
	}

	// Make the initial request
	const data = await doRequest(maxTokens);
	const choice = data.choices?.[0] ?? {};
	const content = choice?.message?.content ?? "";
	const finishReason = choice?.finish_reason;

	// Try to parse the assistant content as JSON
	let parsed = null;
	try {
		parsed = parseJsonContent(content);
		// If the model returned an object wrapper with `meals`, unwrap it
		if (parsed && parsed.meals) parsed = parsed.meals;
	} catch (e) {
		// Parsing failed; we'll attempt a retry below
		parsed = null;
	}

	if ((finishReason === "length" || !parsed) && maxTokens < 4096) {
		const retryTokens = Math.min(
			4096,
			Math.max(maxTokens + 1000, Math.floor(maxTokens * 1.5)),
		);
		try {
			// Retry with a larger token budget when truncated or parse fails
			const retryData = await doRequest(retryTokens);
			const retryChoice = retryData.choices?.[0] ?? {};
			const retryContent = retryChoice?.message?.content ?? "";
			try {
				parsed = parseJsonContent(retryContent);
				if (parsed && parsed.meals) parsed = parsed.meals;
			} catch (e) {
				// ignore parse error on retry
			}
		} catch (er) {
			// ignore request error on retry
		}
	}

	const results = [];

	// Convert parsed items into normalized results
	if (Array.isArray(parsed) && parsed.length) {
		parsed.forEach((item) => {
			if (!item) return;

			const name = item.name || item.title || "Meal";
			let steps = [];

			if (Array.isArray(item.instructions))
				steps = item.instructions.map(String);
			else if (typeof item.instructions === "string") {
				// If instructions are a single string, split heuristically
				steps = item.instructions
					.split(/\\n+|\\.|;|\\u2022/)
					.map((s) => s.trim())
					.filter(Boolean);
			}

			results.push({ name, instructions: steps });
		});
	} else if (parsed && typeof parsed === "object") {
		// single object
		const item = parsed;
		const name =
			item.name ||
			item.title ||
			(mealArray[0] && (mealArray[0].name || mealArray[0].strMeal)) ||
			"Meal";
		let steps = [];
		if (Array.isArray(item.instructions))
			steps = item.instructions.map(String);
		else if (typeof item.instructions === "string") {
			steps = item.instructions
				.split(/\\n+|\\.|;|\\u2022/)
				.map((s) => s.trim())
				.filter(Boolean);
		}

		results.push({ name, instructions: steps });
	}

	// Ensure we return an entry for each requested meal (even if empty instructions)
	return mealArray.map((m) => {
		const found = results.find(
			(r) =>
				(r.name || "").toLowerCase() ===
				(m.name || m.strMeal || "").toLowerCase(),
		);
		return (
			found ?? { name: m.name || m.strMeal || "Meal", instructions: [] }
		);
	});
}

// Generate meal suggestions from pantry items via OpenAI; expects `meals` array
export async function fetchMealSuggestionsFromPantry(
	seedItems,
	openaiKey,
	desiredCount = 8,
	maxTokens = 3000,
) {
	const ingredients = seedItems
		.map((item) => item.name)
		.filter(Boolean)
		.slice(0, 4);

	if (!ingredients.length) {
		return buildMealSuggestionFallbacks();
	}

	if (!openaiKey) {
		throw new Error(
			"Please set your OpenAI API key in settings before requesting meal suggestions.",
		);
	}

	const prompt = `You are an imaginative and practical meal-planning chef. Based on these pantry items: ${ingredients.join(", ")}, produce ${desiredCount} inventive meals that use some of these ingredients while introducing variety in cooking method and flavor profiles. Be bold: include at least one unexpected or interesting ingredient or technique per meal (e.g., pickled, charred, spiced, herb-infused). Aim to avoid repeating the same recipe pattern more than twice.\n\nFor each meal include a reasonable list of ingredients (variable length, at least 1) and list 1–3 grocery items that are NOT present in the pantry so the shopping list has useful items to buy. Use realistic measures (cups, tbsp, g, pieces). Also include a one-sentence cooking note or technique tip.\n\nRespond with ONLY a valid JSON object with a "meals" array property containing ${desiredCount} meals. Each meal should have this structure (extra fields are allowed):\n{\n\t"name": "meal name",\n\t"ingredients": [\n\t\t{"name": "ingredient", "measure": "amount"},\n\t\t...\n\t],\n\t"shopping": ["grocery item", ...],\n\t"note": "brief cooking tip"\n}\n\nBe creative and varied.`;

	async function doRequest(tokensLimit) {
		const resp = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${openaiKey.trim()}`,
			},
			body: JSON.stringify({
				model: "gpt-4o",
				response_format: { type: "json_object" },
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: 0.9,
				max_tokens: tokensLimit,
			}),
		});

		if (!resp.ok) {
			const errorData = await resp.json();
			throw new Error(
				errorData.error?.message || "OpenAI API request failed",
			);
		}

		return resp.json();
	}

	// First request
	const data = await doRequest(maxTokens);
	const choice = data.choices?.[0] ?? {};
	const content = choice?.message?.content ?? "";
	const finishReason = choice?.finish_reason;

	let parsedMeals = null;
	try {
		parsedMeals = parseJsonContent(content);
		if (parsedMeals && parsedMeals.meals) parsedMeals = parsedMeals.meals;
	} catch (e) {
		parsedMeals = null;
	}

	// If truncated or parsing failed, try one retry with a higher token cap
	if (
		(finishReason === "length" ||
			!parsedMeals ||
			(Array.isArray(parsedMeals) && !parsedMeals.length)) &&
		maxTokens < 4096
	) {
		const retryTokens = Math.min(
			4096,
			Math.max(maxTokens + 1000, Math.floor(maxTokens * 1.5)),
		);

		try {
			const retryData = await doRequest(retryTokens);
			const retryChoice = retryData.choices?.[0] ?? {};
			const retryContent = retryChoice?.message?.content ?? "";

			try {
				parsedMeals = parseJsonContent(retryContent);
				if (parsedMeals && parsedMeals.meals)
					parsedMeals = parsedMeals.meals;
			} catch (e) {
				// leave parsedMeals as-is (may be null)
			}
		} catch (retryErr) {
			// ignore retry error and fall through to salvage attempt
		}
	}

	// If we managed to parse at least some meals, return them (allow partial results)
	if (Array.isArray(parsedMeals) && parsedMeals.length) {
		return parsedMeals.slice(0, desiredCount).map((meal, index) => ({
			idMeal: `openai-${Date.now()}-${index}`,
			strMeal: meal.name || "Meal",
			strMealThumb: "",
			strArea: "AI Generated",
			ingredients: Array.isArray(meal.ingredients)
				? meal.ingredients
				: [],
			shopping: Array.isArray(meal.shopping) ? meal.shopping : [],
		}));
	}

	// As a final attempt, try to salvage any object blocks parsed by parseJsonContent
	if (parsedMeals && typeof parsedMeals === "object") {
		// If parser returned an object or list of objects, coerce into array
		const arr = Array.isArray(parsedMeals) ? parsedMeals : [parsedMeals];
		if (arr.length) {
			return arr.slice(0, desiredCount).map((meal, index) => ({
				idMeal: `openai-${Date.now()}-${index}`,
				strMeal: meal.name || meal.strMeal || "Meal",
				strMealThumb: "",
				strArea: "AI Generated",
				ingredients: Array.isArray(meal.ingredients)
					? meal.ingredients
					: [],
				shopping: Array.isArray(meal.shopping) ? meal.shopping : [],
			}));
		}
	}

	throw new Error("Invalid response format from OpenAI.");
}
