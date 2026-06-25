import { guardUUID, invalid, json, notFound, options, parseJSON, rafflePolls, srv } from "./helpers";

const adjectives = [
	"Rapide", "Joyeux", "Malin", "Futé", "Brave", "Agile", "Vif", "Sage",
	"Doux", "Vrai", "Grand", "Petit", "Beau", "Chaud", "Froid", "Fier",
	"Léger", "Futé", "Subtil", "Loyal", "Noble", "Calme", "Chic", "Coquin",
];

const nouns = [
	"Chat", "Chien", "Loup", "Renard", "Ours", "Tigre", "Lion", "Cerf",
	"Hibou", "Aigle", "Dauphin", "Phénix", "Dragon", "Loutre", "Buse",
	"Panda", "Koala", "Paon", "Baleine", "Faucon", "Chouette", "Lynx",
];

const randomPseudo = () => {
	const a = adjectives[Math.floor(Math.random() * adjectives.length)];
	const n = nouns[Math.floor(Math.random() * nouns.length)];
	return `${a}${n}`;
};

export const raffleRoutes = {
	"/api/raffle/:uuid/register": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const body = await parseJSON<{ user_id: string; pseudo?: string }>(req);
			if (!body || !body.user_id) return invalid();

			if (!rafflePolls.has(uuid)) {
				rafflePolls.set(uuid, {
					players: new Map(),
					winnerId: null,
					winnerPseudo: null,
				});
			}
			const poll = rafflePolls.get(uuid)!;
			if (poll.winnerId) return json({ error: "already spun" }, 400);

			const pseudo = body.pseudo?.trim() || randomPseudo();
			poll.players.set(body.user_id, pseudo);

			srv.publish(
				`raffle:${uuid}`,
				JSON.stringify({
					type: "players",
					players: [...poll.players.entries()].map(([id, p]) => ({
						user_id: id,
						pseudo: p,
					})),
				}),
			);
			return json({ pseudo }, 201);
		},
	},

	"/api/raffle/:uuid/spin": {
		OPTIONS: options,
		POST: async (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const poll = rafflePolls.get(uuid);
			if (!poll) return notFound();
			if (poll.winnerId) return json({ error: "already spun" }, 400);
			if (poll.players.size < 2) return json({ error: "not enough players" }, 400);

			const entries = [...poll.players.entries()];
			const winner = entries[Math.floor(Math.random() * entries.length)]!;
			poll.winnerId = winner[0];
			poll.winnerPseudo = winner[1];

			return json({ winnerId: poll.winnerId, winnerPseudo: poll.winnerPseudo });
		},
	},

	"/api/raffle/:uuid/reveal": {
		OPTIONS: options,
		POST: (req: Request) => {
			const uuid = req.params.uuid;
			const err = guardUUID(uuid);
			if (err) return err;
			const poll = rafflePolls.get(uuid);
			if (!poll || !poll.winnerId) return notFound();

			srv.publish(
				`raffle:${uuid}`,
				JSON.stringify({
					type: "winner",
					winnerId: poll.winnerId,
					winnerPseudo: poll.winnerPseudo,
				}),
			);
			return json({ winnerId: poll.winnerId, winnerPseudo: poll.winnerPseudo });
		},
	},

	"/api/raffle/:uuid/players": (req: Request) => {
		if (req.method === "OPTIONS") return options();
		const uuid = req.params.uuid;
		const err = guardUUID(uuid);
		if (err) return err;
		const poll = rafflePolls.get(uuid);
		return json({
			players: poll
				? [...poll.players.entries()].map(([id, p]) => ({ user_id: id, pseudo: p }))
				: [],
		});
	},

	"/api/raffle/:uuid/status": (req: Request) => {
		if (req.method === "OPTIONS") return options();
		const uuid = req.params.uuid;
		const err = guardUUID(uuid);
		if (err) return err;
		const poll = rafflePolls.get(uuid);
		if (!poll) return json({ winnerId: null, winnerPseudo: null, playerCount: 0 });
		return json({
			winnerId: poll.winnerId,
			winnerPseudo: poll.winnerPseudo,
			playerCount: poll.players.size,
		});
	},
};
