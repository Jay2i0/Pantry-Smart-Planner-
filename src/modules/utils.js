// Normalize text: trim, lowercase, replace non-alphanumerics with spaces
export function normalizeText(value) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ");
}

// Check whether two ingredient strings match (exact or partial)
export function matchesIngredient(left, right) {
	const normalizedLeft = normalizeText(left);
	const normalizedRight = normalizeText(right);

	return (
		normalizedLeft === normalizedRight ||
		normalizedLeft.includes(normalizedRight) ||
		normalizedRight.includes(normalizedLeft)
	);
}

// Create a short unique id with a prefix
export function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// Parse JSON payload; strip markdown fences before parsing
export function parseJsonContent(content) {
	const trimmedContent = content?.toString?.() ?? "";
	const withoutFences = trimmedContent
		.replace(/```(?:json)?/gi, "")
		.replace(/```/g, "")
		.trim();

	return JSON.parse(withoutFences);
}
