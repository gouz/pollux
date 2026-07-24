window.parseHash = () => {
	const choices = [
		...LZString.decompressFromEncodedURIComponent(
			window.location.hash.slice(1),
		).split("|"),
	]
		.map((c) => c.trim())
		.filter((c) => c !== "");
	const uuid = choices.shift();
	return { uuid, choices };
};

window.isUUIDv7 = (str) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		str,
	);

window.parseColorString = (str) => {
	const match = str.match(/^(.*?)\[([^\]]+)\]$/);

	if (!match) {
		return { text: str, color: "var(--primary)" };
	}

	const [, text, colorCandidate] = match;
	const isHexColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colorCandidate);

	if (!isHexColor) {
		return { text: str, color: "var(--primary)" };
	}

	return { text, color: colorCandidate };
};

window.createError = (text) => {
	const el = document.createElement("div");
	el.id = "error";
	el.textContent = text;
	return el;
};

// Build a WebSocket URL for the current host, auto-selecting ws/wss.
window.wsURL = (path, params = {}) => {
	const proto = location.protocol === "https:" ? "wss" : "ws";
	const qs = new URLSearchParams(params).toString();
	return `${proto}://${location.host}${path}${qs ? `?${qs}` : ""}`;
};

// POST a JSON body and return the fetch Response.
window.postJSON = (url, body) =>
	fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

// Fetch a fresh server-generated UUIDv7.
window.apiUUID = () => fetch("/api/uuid").then((r) => r.text());

// Get a stable per-poll user id (UUIDv7), creating and caching it if absent.
window.getOrCreateUserId = async (storageKey) => {
	let id = localStorage.getItem(storageKey);
	if (!id || !window.isUUIDv7(id)) {
		id = await window.apiUUID();
		localStorage.setItem(storageKey, id);
	}
	return id;
};

// Keep the screen awake (Screen Wake Lock API). The lock is auto-released when
// the tab is hidden, so we re-acquire it whenever the page becomes visible
// again. No-op on browsers without the API. Returns a stop() function.
window.keepScreenAwake = () => {
	if (!("wakeLock" in navigator)) return () => {};
	let lock = null;
	let stopped = false;
	const acquire = async () => {
		if (stopped || document.visibilityState !== "visible") return;
		try {
			lock = await navigator.wakeLock.request("screen");
		} catch {
			// Denied (e.g. low battery) — nothing else to do.
		}
	};
	const onVisibility = () => {
		if (document.visibilityState === "visible") acquire();
	};
	document.addEventListener("visibilitychange", onVisibility);
	acquire();
	return () => {
		stopped = true;
		document.removeEventListener("visibilitychange", onVisibility);
		if (lock) lock.release().catch(() => {});
		lock = null;
	};
};
