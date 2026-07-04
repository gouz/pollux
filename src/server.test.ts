import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { isUUIDv7 } from "./routes/helpers";

// End-to-end tests against the fully-wired server (routes + SQLite + broadcasts).
// The server runs as a subprocess pointed at a throwaway DB on an ephemeral port,
// so nothing here touches the production data/db.sqlite.

const DB_PATH = `/tmp/pollux-test-${process.pid}.sqlite`;
let proc: ReturnType<typeof Bun.spawn>;
let base: string;

const post = (path: string, body?: unknown) =>
	fetch(`${base}${path}`, {
		method: "POST",
		headers: body ? { "Content-Type": "application/json" } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	});

const newUUID = async () => (await fetch(`${base}/api/uuid`)).text();

beforeAll(async () => {
	proc = Bun.spawn(["bun", "src/index.ts"], {
		env: { ...process.env, POLLUX_DB: DB_PATH, PORT: "0" },
		stdout: "pipe",
		stderr: "pipe",
	});
	// Read stdout until the server announces its (ephemeral) port.
	const reader = (proc.stdout as ReadableStream).getReader();
	const decoder = new TextDecoder();
	let buf = "";
	while (!buf.match(/localhost:(\d+)/)) {
		const { value, done } = await reader.read();
		if (done) throw new Error(`server exited early:\n${buf}`);
		buf += decoder.decode(value);
	}
	base = `http://localhost:${buf.match(/localhost:(\d+)/)![1]}`;
	reader.releaseLock();
});

afterAll(() => {
	proc?.kill();
	for (const suffix of ["", "-wal", "-shm"]) {
		rmSync(`${DB_PATH}${suffix}`, { force: true });
	}
});

describe("uuid", () => {
	test("issues a valid UUIDv7", async () => {
		expect(isUUIDv7(await newUUID())).toBe(true);
	});
});

describe("static polls", () => {
	test("counts votes and flushes", async () => {
		const uuid = await newUUID();
		await post("/api/vote", { uuid, choice: 0 });
		await post("/api/vote", { uuid, choice: 0 });
		await post("/api/vote", { uuid, choice: 1 });

		const { result } = await (await fetch(`${base}/api/vote/${uuid}`)).json();
		expect(result).toEqual([
			{ choice: 0, total: 2 },
			{ choice: 1, total: 1 },
		]);

		await fetch(`${base}/api/flush/${uuid}`);
		const after = await (await fetch(`${base}/api/vote/${uuid}`)).json();
		expect(after.result).toEqual([]);
	});

	test("rejects a non-UUIDv7 poll id", async () => {
		expect((await post("/api/vote", { uuid: "nope", choice: 0 })).status).toBe(
			422,
		);
	});
});

describe("dynamic polls", () => {
	test("isolates results per step via the step*100 encoding", async () => {
		const uuid = await newUUID();
		await post(`/api/dynamic/${uuid}/step`, { step: 0, choices: ["A", "B"] });
		await post(`/api/dynamic/${uuid}/step`, { step: 1, choices: ["X", "Y"] });

		await post("/api/vote", { uuid, choice: 1 }); // step 0, choice 1
		await post("/api/vote", { uuid, choice: 100 }); // step 1, choice 0
		await post("/api/vote", { uuid, choice: 101 }); // step 1, choice 1

		const step0 = await (
			await fetch(`${base}/api/vote/${uuid}?step=0`)
		).json();
		expect(step0.result).toEqual([{ choice: 1, total: 1 }]);

		const step1 = await (
			await fetch(`${base}/api/vote/${uuid}?step=1`)
		).json();
		expect(step1.result).toEqual([
			{ choice: 100, total: 1 },
			{ choice: 101, total: 1 },
		]);
	});
});

describe("raffle", () => {
	test("registration is idempotent and a winner is drawn", async () => {
		const uuid = await newUUID();
		const a = await newUUID();
		const b = await newUUID();

		const r1 = await (await post(`/api/raffle/${uuid}/register`, {
			user_id: a,
		})).json();
		const r2 = await (await post(`/api/raffle/${uuid}/register`, {
			user_id: a,
		})).json();
		expect(r2.pseudo).toBe(r1.pseudo); // same player, same pseudo

		await post(`/api/raffle/${uuid}/register`, { user_id: b });

		const { players } = await (
			await fetch(`${base}/api/raffle/${uuid}/players`)
		).json();
		expect(players).toHaveLength(2); // A counted once, plus B

		const spin = await post(`/api/raffle/${uuid}/spin`);
		expect(spin.status).toBe(200);
		const winner = await spin.json();
		expect([a, b]).toContain(winner.winnerId);

		// registering after the draw is refused
		const late = await post(`/api/raffle/${uuid}/register`, {
			user_id: await newUUID(),
		});
		expect(late.status).toBe(400);

		const status = await (
			await fetch(`${base}/api/raffle/${uuid}/status`)
		).json();
		expect(status.winnerId).toBe(winner.winnerId);
		expect(status.playerCount).toBe(2);
	});

	test("refuses to spin with fewer than two players", async () => {
		const uuid = await newUUID();
		await post(`/api/raffle/${uuid}/register`, { user_id: await newUUID() });
		expect((await post(`/api/raffle/${uuid}/spin`)).status).toBe(400);
	});
});

describe("quizz", () => {
	test("scores a submission with a speed bonus", async () => {
		const uuid = await newUUID();
		const user = await newUUID();
		await post(`/api/quizz/${uuid}/register`, { user_id: user, pseudo: "Tester" });
		await post(`/api/quizz/${uuid}/step`, {
			step: 0,
			choices: ["A", "B"],
			correct: [0],
			question: "Q?",
		});

		const res = await post("/api/quizz/vote", {
			uuid,
			user_id: user,
			step: 0,
			choices: [0],
			response_time_ms: 0,
		});
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.correctScore).toBe(1);
		expect(body.total).toBe(1);
		expect(body.speedBonus).toBe(1); // instant answer, total 1
		expect(body.score).toBe(2);

		const { scores } = await (
			await fetch(`${base}/api/quizz/${uuid}/scores`)
		).json();
		expect(scores).toEqual([
			{ user_id: user, pseudo: "Tester", score: 2, total: 1 },
		]);
	});
});
