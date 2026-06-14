import {
	dynamicPolls,
	getStepParam,
	guardUUID,
	invalid,
	json,
	notFound,
	options,
	parseJSON,
	srv,
} from "./helpers";

export const dynamicRoutes = {
	"/api/dynamic/:uuid/step": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const body = await parseJSON<{ step: number; choices: string[] }>(req);
			if (!body || typeof body.step !== "number" || !body.choices?.length)
				return invalid();
			if (!dynamicPolls.has(uuid)) dynamicPolls.set(uuid, new Map());
			dynamicPolls.get(uuid)?.set(body.step, body.choices);
			srv.publish(
				`dynamic:${uuid}`,
				JSON.stringify({
					type: "step",
					step: body.step,
					choices: body.choices,
				}),
			);
			return json(null, 201);
		},
		GET: (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const step = getStepParam(req);
			if (step === null) return invalid();
			const choices = dynamicPolls.get(uuid)?.get(step);
			return choices ? json({ step, choices }) : notFound();
		},
	},
};
