import votePage from "./vote.html";
import resultPage from "./result.html";
import { clean, getResults, vote } from "./db";
import type { CronWithAutocomplete } from "bun";

const isUUIDv7 = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str,
  );
const server = Bun.serve({
  routes: {
    "/": votePage,
    "/result": resultPage,
    "/api/vote": {
      POST: async (req) => {
        const body = (await req.json()) as { uuid: string; choice: number };
        if (isUUIDv7(body.uuid)) {
          vote.run(body);
          return new Response("", { status: 201 });
        }
        return new Response("", { status: 422 });
      },
    },
    "/api/vote/:uuid": (req) =>
      Response.json({ result: getResults.all(req.params.uuid) }),
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});
