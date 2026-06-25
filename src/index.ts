#!/usr/bin/env bun
import { Cron } from "croner";
import { clean, cleanQuizzAnswers, cleanQuizzPlayers, cleanQuizzSubmissions } from "./db";
import { assets } from "./routes/assets";
import { dynamicRoutes } from "./routes/dynamic";
import { setServer } from "./routes/helpers";
import { pages } from "./routes/pages";
import { quizzRoutes } from "./routes/quizz";
import { raffleRoutes } from "./routes/raffle";
import { uuidRoute } from "./routes/uuid";
import { voteRoutes } from "./routes/vote";
import { websocket, wsUpgrade } from "./routes/ws";

const srv = Bun.serve({
	port: 3000,
	routes: {
		...pages,
		...assets,
		...uuidRoute,
		...voteRoutes,
		...dynamicRoutes,
		...quizzRoutes,
		...raffleRoutes,
	},

	websocket,

	fetch(req, server) {
		const r = wsUpgrade(req, server);
		if (r) return r;
		return new Response("Not Found", { status: 404 });
	},
});

setServer(srv);

new Cron("0 * * * * *", () => {
	clean.run();
	cleanQuizzAnswers.run();
	cleanQuizzSubmissions.run();
	cleanQuizzPlayers.run();
});

console.log("Pollux is running on http://localhost:3000");
