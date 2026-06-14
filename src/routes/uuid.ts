import { corsHeaders, options } from "./helpers";

export const uuidRoute: Record<
	string,
	{ OPTIONS: () => Response; GET: () => Response }
> = {
	"/api/uuid": {
		OPTIONS: options,
		GET: () => new Response(Bun.randomUUIDv7(), { headers: corsHeaders }),
	},
};
