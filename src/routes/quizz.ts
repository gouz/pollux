import {
	getPlayers,
	getQuizzAnswer,
	getQuizzResults,
	getQuizzScores,
	getQuizzStepScores,
	getQuizzUserSubmissions,
	registerPlayer,
	setQuizzAnswer,
	submitQuizzVote,
} from "../db";
import {
	corsHeaders,
	getStepParam,
	guardUUID,
	invalid,
	isUUIDv7,
	json,
	notFound,
	options,
	parseJSON,
	quizzPolls,
	srv,
} from "./helpers";

export const quizzRoutes = {
	"/api/quizz/:uuid/step": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const body = await parseJSON<{
				step: number;
				choices: string[];
				correct: number[];
				question?: string;
			}>(req);
			if (
				!body ||
				typeof body.step !== "number" ||
				!body.choices?.length ||
				!body.correct?.length
			)
				return invalid();
			if (!quizzPolls.has(uuid)) quizzPolls.set(uuid, new Map());
			const question = body.question || "";
			quizzPolls.get(uuid)?.set(body.step, { choices: body.choices, question });
			setQuizzAnswer.run({
				uuid,
				step: body.step,
				correct: JSON.stringify(body.correct),
				question,
				choices: JSON.stringify(body.choices),
			});
			return json(null, 201);
		},
		GET: (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const step = getStepParam(req);
			if (step === null) return invalid();
			const data = quizzPolls.get(uuid)?.get(step);
			const answer = getQuizzAnswer.get({ uuid, step }) as
				| { correct: string; question: string; timer: number; choices: string }
				| undefined;
			if (!data && !answer) return notFound();
			return json({
				step,
				choices:
					data?.choices || (answer?.choices ? JSON.parse(answer.choices) : []),
				question: data?.question || answer?.question || "",
				correct: answer ? JSON.parse(answer.correct) : [],
				timer: data?.timer || answer?.timer || 0,
				startedAt: data?.startedAt || null,
			});
		},
	},

	"/api/quizz/:uuid/start": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const body = await parseJSON<{ step: number; timer?: number }>(req);
			if (!body || typeof body.step !== "number") return invalid();
			const data = quizzPolls.get(uuid)?.get(body.step);
			if (!data) return notFound();
			const timer = body.timer ?? 30;
			const startedAt = Date.now();
			data.startedAt = startedAt;
			data.timer = timer;
			const answer = getQuizzAnswer.get({ uuid, step: body.step }) as
				| { correct: string; question: string }
				| undefined;
			srv.publish(
				`quizz:${uuid}`,
				JSON.stringify({
					type: "start",
					step: body.step,
					choices: data.choices,
					question: data.question || answer?.question || "",
					correct: answer ? JSON.parse(answer.correct) : [],
					timer,
					startedAt,
				}),
			);
			return json({ step: body.step, timer, startedAt });
		},
	},

	"/api/quizz/:uuid/podium": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const scores = getQuizzScores.all({ uuid });
			srv.publish(`quizz:${uuid}`, JSON.stringify({ type: "podium", scores }));
			return json({ scores });
		},
	},

	"/api/quizz/:uuid/register": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const body = await parseJSON<{ user_id: string; pseudo: string }>(req);
			if (!body || !isUUIDv7(body.user_id) || !body.pseudo?.trim())
				return invalid();
			registerPlayer.run({
				uuid,
				user_id: body.user_id,
				pseudo: body.pseudo.trim(),
			});
			srv.publish(
				`quizz:${uuid}`,
				JSON.stringify({ type: "players", players: getPlayers.all({ uuid }) }),
			);
			return json(null, 201);
		},
	},

	"/api/quizz/:uuid/players": (req: Request) => {
		if (req.method === "OPTIONS") return options();
		const err = guardUUID(req.params.uuid);
		return err || json({ players: getPlayers.all({ uuid: req.params.uuid }) });
	},

	"/api/quizz/vote": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const body = await parseJSON<{
				uuid: string;
				user_id: string;
				step: number;
				choices: number[];
				response_time_ms?: number;
			}>(req);
			if (!body || !isUUIDv7(body.uuid) || !isUUIDv7(body.user_id))
				return invalid();
			const stepData = quizzPolls.get(body.uuid)?.get(body.step);
			if (
				stepData?.startedAt &&
				stepData?.timer &&
				Date.now() - stepData.startedAt > stepData.timer * 1000
			) {
				return new Response("", { status: 408, headers: corsHeaders });
			}
			const answer = getQuizzAnswer.get({
				uuid: body.uuid,
				step: body.step,
			}) as { correct: string } | undefined;
			if (!answer) return invalid();
			const correct: number[] = JSON.parse(answer.correct);
			const correctScore = body.choices.filter((c) =>
				correct.includes(c),
			).length;
			const total = correct.length;
			const responseTime = body.response_time_ms ?? 0;
			const speedBonus =
				correctScore > 0
					? Math.round(Math.max(0, 1 - responseTime / 20000) * total)
					: 0;
			const score = correctScore + speedBonus;
			submitQuizzVote.run({
				uuid: body.uuid,
				user_id: body.user_id,
				step: body.step,
				choices: JSON.stringify(body.choices),
				score,
				total,
				response_time_ms: responseTime,
			});
			const step = body.step;
			srv.publish(
				`quizz:${body.uuid}`,
				JSON.stringify({
					type: "result",
					step,
					result: getQuizzResults.all({ uuid: body.uuid, step }),
				}),
			);
			srv.publish(
				`quizz:${body.uuid}`,
				JSON.stringify({
					type: "score",
					step,
					scores: getQuizzStepScores.all({ uuid: body.uuid, step }),
				}),
			);
			return json({ score, total, correct, correctScore, speedBonus }, 201);
		},
	},

	"/api/quizz/:uuid/scores": (req: Request) => {
		if (req.method === "OPTIONS") return options();
		const uuid = req.params.uuid;
		const err = guardUUID(uuid);
		if (err) return err;
		const userId = new URL(req.url).searchParams.get("user_id");
		if (userId && isUUIDv7(userId)) {
			return json({
				submissions: getQuizzUserSubmissions.all({ uuid, user_id: userId }),
			});
		}
		return json({ scores: getQuizzScores.all({ uuid }) });
	},

	"/api/quizz/:uuid/results": (req: Request) => {
		if (req.method === "OPTIONS") return options();
		const uuid = req.params.uuid;
		const err = guardUUID(uuid);
		if (err) return err;
		const step = getStepParam(req);
		return step !== null
			? json({ result: getQuizzResults.all({ uuid, step }) })
			: invalid();
	},
};
