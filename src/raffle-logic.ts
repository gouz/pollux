// Pure raffle helpers (pseudo generation + winner draw), kept free of state and
// HTTP so they can be unit-tested. The rng is injectable for deterministic tests.

export const adjectives = [
	"Rapide", "Joyeux", "Malin", "Futé", "Brave", "Agile", "Vif", "Sage",
	"Doux", "Vrai", "Grand", "Petit", "Beau", "Chaud", "Froid", "Fier",
	"Léger", "Subtil", "Loyal", "Noble", "Calme", "Chic", "Coquin",
];

export const nouns = [
	"Chat", "Chien", "Loup", "Renard", "Ours", "Tigre", "Lion", "Cerf",
	"Hibou", "Aigle", "Dauphin", "Phénix", "Dragon", "Loutre", "Buse",
	"Panda", "Koala", "Paon", "Baleine", "Faucon", "Chouette", "Lynx",
];

type Rng = () => number;

const pick = <T>(arr: T[], rng: Rng): T =>
	arr[Math.floor(rng() * arr.length)] as T;

export const randomPseudo = (rng: Rng = Math.random): string =>
	`${pick(nouns, rng)} ${pick(adjectives, rng)}`;

// Return a pseudo not already in `existing`, giving up after `maxAttempts`
// (a collision after that many tries is accepted rather than looping forever).
export const uniquePseudo = (
	existing: Set<string>,
	rng: Rng = Math.random,
	maxAttempts = 50,
): string => {
	let pseudo: string;
	let attempts = 0;
	do {
		pseudo = randomPseudo(rng);
		attempts++;
	} while (existing.has(pseudo) && attempts < maxAttempts);
	return pseudo;
};

// Pick a winning [id, pseudo] entry uniformly at random.
export const pickWinner = <T>(entries: T[], rng: Rng = Math.random): T =>
	entries[Math.floor(rng() * entries.length)] as T;
