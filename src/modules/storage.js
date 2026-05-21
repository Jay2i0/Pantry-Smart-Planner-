import { useEffect, useState } from "react";

// Load a value from localStorage with a fallback
export function loadStoredValue(key, fallback) {
	if (typeof window === "undefined") {
		return fallback;
	}

	try {
		const rawValue = window.localStorage.getItem(key);
		return rawValue ? JSON.parse(rawValue) : fallback;
	} catch {
		return fallback;
	}
}

// React hook for localStorage-backed state
export function useLocalStorageState(key, fallback) {
	const [value, setValue] = useState(() => loadStoredValue(key, fallback));

	useEffect(() => {
		window.localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);

	return [value, setValue];
}
