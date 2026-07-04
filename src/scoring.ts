// Pure quiz-scoring logic, kept free of DB/HTTP so it can be unit-tested and
// reasoned about in isolation. Used by the /api/quizz/vote handler.

// How long (ms) a full-speed answer stays worth the maximum speed bonus decay.
export const SPEED_BONUS_WINDOW_MS = 20000;

export type QuizzScore = {
	correctScore: number;
	total: number;
	speedBonus: number;
	score: number;
};

/**
 * Score a quiz submission.
 *
 * - `correctScore`: how many of the picked choices are correct.
 * - `total`: number of correct answers for the question.
 * - `speedBonus`: only awarded when at least one correct answer was picked;
 *   decays linearly from `total` (instant) to 0 at `SPEED_BONUS_WINDOW_MS`.
 * - `score`: `correctScore + speedBonus`.
 *
 * Wrong extra picks are not penalised, matching the original behaviour.
 */
export const computeQuizzScore = (
	correct: number[],
	choices: number[],
	responseTimeMs: number,
): QuizzScore => {
	const correctScore = choices.filter((c) => correct.includes(c)).length;
	const total = correct.length;
	const speedBonus =
		correctScore > 0
			? Math.round(
					Math.max(0, 1 - responseTimeMs / SPEED_BONUS_WINDOW_MS) * total,
				)
			: 0;
	return { correctScore, total, speedBonus, score: correctScore + speedBonus };
};
