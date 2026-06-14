import type { Server, WebSocketHandler } from "bun";
import {
	getPlayers,
	getQuizzAnswer,
	getQuizzResults,
	getQuizzStepScores,
	getResults,
	getResultsByStep,
} from "../db";
import {
	dynamicPolls,
	isUUIDv7,
	quizzPolls,
	type WebSocketData,
} from "./helpers";

export const websocket: WebSocketHandler<WebSocketData> = {
	data: {} as WebSocketData,

	open: (ws) => {
		const { uuid, kind } = ws.data;
		if (kind === "dynamic") {
			ws.subscribe(`dynamic:${uuid}`);
			const poll = dynamicPolls.get(uuid);
			if (poll) {
				const maxStep = Math.max(...poll.keys());
				const choices = poll.get(maxStep);
				if (choices) {
					ws.send(JSON.stringify({ type: "step", step: maxStep, choices }));
					ws.send(
						JSON.stringify({
							type: "result",
							step: maxStep,
							result: getResultsByStep.all({
								uuid,
								min: maxStep * 100,
								max: maxStep * 100 + 99,
							}),
						}),
					);
				}
			}
		} else if (kind === "quizz") {
			ws.subscribe(`quizz:${uuid}`);
			ws.send(
				JSON.stringify({ type: "players", players: getPlayers.all({ uuid }) }),
			);
			const poll = quizzPolls.get(uuid);
			if (poll) {
				const maxStep = Math.max(...poll.keys());
				const data = poll.get(maxStep);
				if (data?.startedAt) {
					const answer = getQuizzAnswer.get({ uuid, step: maxStep }) as
						| { correct: string; question: string }
						| undefined;
					ws.send(
						JSON.stringify({
							type: "start",
							step: maxStep,
							choices: data.choices,
							question: data.question || answer?.question || "",
							correct: answer ? JSON.parse(answer.correct) : [],
							timer: data.timer,
							startedAt: data.startedAt,
						}),
					);
					ws.send(
						JSON.stringify({
							type: "result",
							step: maxStep,
							result: getQuizzResults.all({ uuid, step: maxStep }),
						}),
					);
					ws.send(
						JSON.stringify({
							type: "score",
							step: maxStep,
							scores: getQuizzStepScores.all({ uuid, step: maxStep }),
						}),
					);
				}
			}
		} else {
			ws.subscribe(uuid);
			ws.send(JSON.stringify({ result: getResults.all(uuid) }));
		}
	},

	message: () => {},

	close: (ws) => {
		const prefix =
			ws.data.kind === "dynamic"
				? "dynamic:"
				: ws.data.kind === "quizz"
					? "quizz:"
					: "";
		ws.unsubscribe(prefix + ws.data.uuid);
	},
};

export const wsUpgrade = (req: Request, server: Server) => {
	const url = new URL(req.url);
	const path = url.pathname;
	const upgrade = (kind: "static" | "dynamic" | "quizz", user?: string) => {
		const uuid = url.searchParams.get("uuid") ?? "";
		if (!isUUIDv7(uuid) || (user && !isUUIDv7(user)))
			return new Response("", { status: 422 });
		const data: WebSocketData = { uuid, kind };
		if (user) data.user_id = user;
		return server.upgrade(req, { data })
			? new Response("Hello World")
			: new Response("Upgrade failed", { status: 400 });
	};
	if (path === "/ws") return upgrade("static");
	if (path === "/ws/dynamic") return upgrade("dynamic");
	if (path === "/ws/quizz")
		return upgrade("quizz", url.searchParams.get("user") ?? "");
	return null;
};
