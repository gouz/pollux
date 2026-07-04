import { describe, expect, test } from "bun:test";
import { computeQuizzScore, SPEED_BONUS_WINDOW_MS } from "./scoring";

describe("computeQuizzScore", () => {
	test("all correct, instant answer: full score + full speed bonus", () => {
		// 2 correct picked out of 2, responseTime 0 → bonus == total
		expect(computeQuizzScore([0, 1], [0, 1], 0)).toEqual({
			correctScore: 2,
			total: 2,
			speedBonus: 2,
			score: 4,
		});
	});

	test("partial correct still earns a (rounded) speed bonus", () => {
		// 1 of 2 correct, instant → bonus = round(1 * 2) = 2
		expect(computeQuizzScore([0, 1], [0], 0)).toEqual({
			correctScore: 1,
			total: 2,
			speedBonus: 2,
			score: 3,
		});
	});

	test("no correct answer: zero score and no speed bonus", () => {
		expect(computeQuizzScore([0], [1], 0)).toEqual({
			correctScore: 0,
			total: 1,
			speedBonus: 0,
			score: 0,
		});
	});

	test("speed bonus decays to 0 at the window edge", () => {
		const r = computeQuizzScore([0], [0], SPEED_BONUS_WINDOW_MS);
		expect(r.speedBonus).toBe(0);
		expect(r.score).toBe(1); // just the correct point
	});

	test("speed bonus is clamped at 0 past the window", () => {
		const r = computeQuizzScore([0, 1], [0, 1], SPEED_BONUS_WINDOW_MS * 2);
		expect(r.speedBonus).toBe(0);
		expect(r.score).toBe(2);
	});

	test("bonus is proportional at half the window", () => {
		// halfway → factor 0.5, total 2 → round(1.0) = 1
		expect(computeQuizzScore([0, 1], [0, 1], SPEED_BONUS_WINDOW_MS / 2))
			.toMatchObject({ speedBonus: 1, score: 3 });
	});

	test("extra wrong picks are not penalised", () => {
		// picked 0 (correct) and 2 (wrong); only correct hits count
		expect(computeQuizzScore([0, 1], [0, 2], 0)).toMatchObject({
			correctScore: 1,
		});
	});
});
