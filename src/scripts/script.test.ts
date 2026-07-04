import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

// script.js is a browser script that attaches helpers onto `window`. We give it
// a DOM via happy-dom, stub the CDN-provided LZString, then exercise the pure
// helpers. Globals are torn down afterwards so other test files stay clean.

beforeAll(async () => {
	GlobalRegistrator.register();
	// parseHash() calls LZString (loaded from a CDN in the browser); stub it so
	// we test the parsing logic, not the compression.
	(globalThis as { LZString?: unknown }).LZString = {
		decompressFromEncodedURIComponent: () =>
			"019f2e00-ab56-7000-96e4-3f663540e9e6|Red| Blue |",
	};
	await import("./script.js");
});

afterAll(async () => {
	await GlobalRegistrator.unregister();
});

describe("parseColorString", () => {
	test("extracts a valid 6-digit hex color", () => {
		expect(window.parseColorString("Red[#ff0000]")).toEqual({
			text: "Red",
			color: "#ff0000",
		});
	});

	test("accepts a 3-digit hex color", () => {
		expect(window.parseColorString("Green[#0f0]")).toEqual({
			text: "Green",
			color: "#0f0",
		});
	});

	test("falls back to the primary color when there is no bracket", () => {
		expect(window.parseColorString("Plain")).toEqual({
			text: "Plain",
			color: "var(--primary)",
		});
	});

	test("keeps the raw label and falls back when the bracket is not a hex color", () => {
		expect(window.parseColorString("Bad[notcolor]")).toEqual({
			text: "Bad[notcolor]",
			color: "var(--primary)",
		});
	});
});

describe("parseHash", () => {
	test("splits the uuid from the choices, trimming and dropping blanks", () => {
		expect(window.parseHash()).toEqual({
			uuid: "019f2e00-ab56-7000-96e4-3f663540e9e6",
			choices: ["Red", "Blue"],
		});
	});
});

describe("isUUIDv7 (client)", () => {
	test("mirrors the server validation", () => {
		expect(window.isUUIDv7("019f2e00-ab56-7000-96e4-3f663540e9e6")).toBe(true);
		expect(window.isUUIDv7("019f2e00-ab56-4000-96e4-3f663540e9e6")).toBe(false);
		expect(window.isUUIDv7("nope")).toBe(false);
	});
});
