import { describe, expect, test } from "bun:test";
import {
	adjectives,
	nouns,
	pickWinner,
	randomPseudo,
	uniquePseudo,
} from "./raffle-logic";

// A deterministic rng that replays a fixed sequence of values in [0,1).
const seq = (...values: number[]) => {
	let i = 0;
	return () => values[i++ % values.length] as number;
};

describe("randomPseudo", () => {
	test("combines a noun and an adjective from the lists", () => {
		const p = randomPseudo(seq(0, 0)); // first noun, first adjective
		expect(p).toBe(`${nouns[0]} ${adjectives[0]}`);
	});

	test("all generated words come from the known lists", () => {
		const p = randomPseudo(seq(0.5, 0.5));
		const [noun, adj] = p.split(" ");
		expect(nouns).toContain(noun);
		expect(adjectives).toContain(adj);
	});
});

describe("uniquePseudo", () => {
	test("returns a fresh pseudo when there is no collision", () => {
		const p = uniquePseudo(new Set(), seq(0, 0));
		expect(p).toBe(`${nouns[0]} ${adjectives[0]}`);
	});

	test("retries when the first candidate is already taken", () => {
		const taken = new Set([`${nouns[0]} ${adjectives[0]}`]);
		// first draw collides (0,0), second draw picks a different pair
		const p = uniquePseudo(taken, seq(0, 0, 0, 0.5));
		expect(taken.has(p)).toBe(false);
	});

	test("gives up after maxAttempts and returns a (colliding) value", () => {
		const collision = `${nouns[0]} ${adjectives[0]}`;
		// rng always yields the taken pseudo; must terminate, not hang
		const p = uniquePseudo(new Set([collision]), seq(0, 0), 3);
		expect(p).toBe(collision);
	});
});

describe("pickWinner", () => {
	test("selects the entry addressed by the rng", () => {
		const entries = ["a", "b", "c", "d"];
		expect(pickWinner(entries, () => 0)).toBe("a");
		expect(pickWinner(entries, () => 0.5)).toBe("c");
		expect(pickWinner(entries, () => 0.99)).toBe("d");
	});

	test("always returns a member of the list", () => {
		const entries = [1, 2, 3];
		for (const r of [0, 0.33, 0.66, 0.999]) {
			expect(entries).toContain(pickWinner(entries, () => r));
		}
	});
});
