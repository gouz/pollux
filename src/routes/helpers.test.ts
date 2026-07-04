import { describe, expect, test } from "bun:test";
import {
	getStepParam,
	guardUUID,
	isUUIDv7,
	parseJSON,
	stepRange,
} from "./helpers";

const VALID_V7 = "019f2e00-ab56-7000-96e4-3f663540e9e6";

describe("isUUIDv7", () => {
	test("accepts a valid UUIDv7", () => {
		expect(isUUIDv7(VALID_V7)).toBe(true);
	});

	test("is case-insensitive", () => {
		expect(isUUIDv7(VALID_V7.toUpperCase())).toBe(true);
	});

	test("rejects a UUIDv4 (wrong version nibble)", () => {
		// version digit is 4, not 7
		expect(isUUIDv7("019f2e00-ab56-4000-96e4-3f663540e9e6")).toBe(false);
	});

	test("rejects a wrong variant nibble", () => {
		// variant must be 8/9/a/b — here it is 7
		expect(isUUIDv7("019f2e00-ab56-7000-76e4-3f663540e9e6")).toBe(false);
	});

	test("rejects garbage and empty input", () => {
		expect(isUUIDv7("")).toBe(false);
		expect(isUUIDv7("not-a-uuid")).toBe(false);
		expect(isUUIDv7(`${VALID_V7}-extra`)).toBe(false);
	});
});

describe("stepRange", () => {
	test("maps step 0 to choices 0..99", () => {
		expect(stepRange(0)).toEqual({ min: 0, max: 99 });
	});

	test("maps step 3 to choices 300..399", () => {
		expect(stepRange(3)).toEqual({ min: 300, max: 399 });
	});

	test("range width is always 100 (max 100 choices per step)", () => {
		for (const step of [0, 1, 7, 42]) {
			const { min, max } = stepRange(step);
			expect(max - min).toBe(99);
			expect(min).toBe(step * 100);
		}
	});
});

describe("getStepParam", () => {
	const req = (url: string) => new Request(url);

	test("parses the step query param", () => {
		expect(getStepParam(req("http://x/api?step=2"))).toBe(2);
		expect(getStepParam(req("http://x/api?step=0"))).toBe(0);
	});

	test("returns null when step is absent", () => {
		expect(getStepParam(req("http://x/api"))).toBeNull();
	});

	test("returns null when step is not a number", () => {
		expect(getStepParam(req("http://x/api?step=abc"))).toBeNull();
	});
});

describe("guardUUID", () => {
	test("returns null for a valid UUIDv7", () => {
		expect(guardUUID(VALID_V7)).toBeNull();
	});

	test("returns a 422 response for an invalid id", () => {
		const res = guardUUID("nope");
		expect(res).toBeInstanceOf(Response);
		expect(res?.status).toBe(422);
	});
});

describe("parseJSON", () => {
	const jsonReq = (body: string) =>
		new Request("http://x/api", { method: "POST", body });

	test("parses a valid JSON body", async () => {
		const out = await parseJSON<{ a: number }>(jsonReq('{"a":1}'));
		expect(out).toEqual({ a: 1 });
	});

	test("returns null on malformed JSON instead of throwing", async () => {
		expect(await parseJSON(jsonReq("{not json"))).toBeNull();
	});
});
