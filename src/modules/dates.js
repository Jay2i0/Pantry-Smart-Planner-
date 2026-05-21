// Return a Date at the start of today (00:00)
export function getTodayStart() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return today;
}

// Add a number of days to a given date
export function addDays(date, amount) {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + amount);
	return nextDate;
}

// Convert a Date to ISO yyyy-mm-dd string
export function toIsoDate(date) {
	return date.toISOString().slice(0, 10);
}

// Format a short date label (e.g., Mon, Jan 1)
export function formatDateLabel(date) {
	return date.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

// Format a long human-readable date (weekday, month, day)
export function formatLongDate(date) {
	return date.toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

// Format a date value into a friendly localized string
export function formatFriendlyDate(value) {
	return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

// Normalize expiry input (days or date) into number of days from reference
export function normalizeExpiryDays(value, referenceDate = getTodayStart()) {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const numericDays = Number(value);

	// If value is already a numeric number of days, use it
	if (Number.isFinite(numericDays)) {
		return Math.max(0, Math.round(numericDays));
	}

	const parsedDate = new Date(value);

	// If value can be parsed as a date string, compute days difference
	if (Number.isNaN(parsedDate.getTime())) {
		return null;
	}

	const startOfParsedDate = new Date(
		parsedDate.getFullYear(),
		parsedDate.getMonth(),
		parsedDate.getDate(),
	);

	// Return whole days from reference date (no negatives)
	return Math.max(
		0,
		Math.round(
			(startOfParsedDate.getTime() - referenceDate.getTime()) / 86400000,
		),
	);
}

// Get expiry Date for a pantry item using expiryDate, expiryDays, or shelfLife
export function getExpiryDate(item) {
	if (item.expiryDate) {
		return new Date(`${item.expiryDate}T00:00:00`);
	}

	if (item.expiryDays !== null && item.expiryDays !== undefined) {
		return addDays(new Date(`${item.addedAt}T00:00:00`), item.expiryDays);
	}

	return addDays(new Date(`${item.addedAt}T00:00:00`), item.shelfLifeDays);
}

// Check if an item is available on a specific date (not expired)
export function isItemAvailableOn(item, date) {
	return getExpiryDate(item) >= date;
}
