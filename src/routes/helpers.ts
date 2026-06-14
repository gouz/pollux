import type { Server } from "bun";

export type WebSocketData = {
	uuid: string;
	user_id?: string;
	kind: "static" | "dynamic" | "quizz";
};

export type QuizzStepData = {
	choices: string[];
	question: string;
	startedAt?: number;
	timer?: number;
};

export const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export const isUUIDv7 = (str: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		str,
	);

export const html = (s: string) =>
	new Response(s, { headers: { "Content-Type": "text/html" } });

export const js = (s: string) =>
	new Response(s as unknown as string, {
		headers: { "Content-Type": "application/javascript" },
	});

export const options = () =>
	new Response("", { status: 204, headers: corsHeaders });

export const json = (data: unknown, status = 200) =>
	Response.json(data, { status, headers: corsHeaders });

export const invalid = () =>
	new Response("", { status: 422, headers: corsHeaders });

export const notFound = () =>
	new Response("", { status: 404, headers: corsHeaders });

export const guardUUID = (uuid: string) => (isUUIDv7(uuid) ? null : invalid());

export const getStepParam = (req: Request) => {
	const step = parseInt(new URL(req.url).searchParams.get("step") ?? "", 10);
	return Number.isNaN(step) ? null : step;
};

export const parseJSON = async <T>(req: Request): Promise<T | null> => {
	try {
		return (await req.json()) as T;
	} catch {
		return null;
	}
};

export const dynamicPolls = new Map<string, Map<number, string[]>>();
export const quizzPolls = new Map<string, Map<number, QuizzStepData>>();

export let srv: Server;
export const setServer = (server: Server) => {
	srv = server;
};
