import { flush, getResults, getResultsByStep, vote } from "../db";
import {
	corsHeaders,
	getStepParam,
	guardUUID,
	invalid,
	isUUIDv7,
	json,
	options,
	parseJSON,
	srv,
} from "./helpers";

export const voteRoutes = {
	"/api/vote": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const body = await parseJSON<{ uuid: string; choice: number }>(req);
			if (!body || !isUUIDv7(body.uuid)) return invalid();
			vote.run(body);
			srv.publish(
				body.uuid,
				JSON.stringify({ result: getResults.all(body.uuid) }),
			);
			const step = Math.floor(body.choice / 100);
			srv.publish(
				`dynamic:${body.uuid}`,
				JSON.stringify({
					type: "result",
					step,
					result: getResultsByStep.all({
						uuid: body.uuid,
						min: step * 100,
						max: step * 100 + 99,
					}),
				}),
			);
			return json(null, 201);
		},
	},

	"/api/vote/:uuid": (req: Request) => {
		if (req.method === "OPTIONS") return options();
		const err = guardUUID(req.params.uuid);
		if (err) return err;
		const step = getStepParam(req);
		const data =
			step !== null
				? getResultsByStep.all({
						uuid: req.params.uuid,
						min: step * 100,
						max: step * 100 + 99,
					})
				: getResults.all(req.params.uuid);
		return json({ result: data });
	},

	"/api/flush/:uuid": (req: Request) => {
		if (req.method === "OPTIONS") return options();
		const err = guardUUID(req.params.uuid);
		if (err) return err;
		flush.run(req.params.uuid);
		srv.publish(
			req.params.uuid,
			JSON.stringify({ result: getResults.all(req.params.uuid) }),
		);
		return new Response("", { status: 200, headers: corsHeaders });
	},
};
