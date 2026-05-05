#!/usr/bin/env bun
import { Cron } from "croner";
import { clean, flush, getResults, vote } from "./db";
import indexPage from "./index.html";
import manyPage from "./many.html";
import resultPage from "./result.html";
import votePage from "./vote.html";

type WebSocketData = {
  uuid: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const isUUIDv7 = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str,
  );
const srv = Bun.serve({
  routes: {
    "/": indexPage,
    "/many": manyPage,
    "/results": resultPage,
    "/vote": votePage,

    "/api/uuid": (req) => {
      if (req.method === "OPTIONS")
        return new Response("", { status: 204, headers: corsHeaders });
      return new Response(Bun.randomUUIDv7(), { headers: corsHeaders });
    },

    "/api/vote": {
      OPTIONS: () => new Response("", { status: 204, headers: corsHeaders }),
      POST: async (req) => {
        const body = (await req.json()) as { uuid: string; choice: number };
        if (isUUIDv7(body.uuid)) {
          vote.run(body);
          srv.publish(
            body.uuid,
            JSON.stringify({ result: getResults.all(body.uuid) }),
          );
          return new Response("", { status: 201, headers: corsHeaders });
        }
        return new Response("", { status: 422, headers: corsHeaders });
      },
    },

    "/api/vote/:uuid": (req) => {
      if (req.method === "OPTIONS")
        return new Response("", { status: 204, headers: corsHeaders });
      if (isUUIDv7(req.params.uuid))
        return Response.json(
          { result: getResults.all(req.params.uuid) },
          { headers: corsHeaders },
        );
      return new Response("", { status: 422, headers: corsHeaders });
    },

    "/api/flush/:uuid": (req) => {
      if (req.method === "OPTIONS")
        return new Response("", { status: 204, headers: corsHeaders });
      if (isUUIDv7(req.params.uuid)) {
        flush.run(req.params.uuid);
        srv.publish(
          req.params.uuid,
          JSON.stringify({ result: getResults.all(req.params.uuid) }),
        );
        return new Response("", { status: 200, headers: corsHeaders });
      }
      return new Response("", { status: 422, headers: corsHeaders });
    },
  },
  websocket: {
    data: {} as WebSocketData,
    open: (ws) => {
      ws.subscribe(ws.data.uuid);
      srv.publish(
        ws.data.uuid,
        JSON.stringify({ result: getResults.all(ws.data.uuid) }),
      );
    },
    message: () => {},
    close: (ws) => {
      ws.unsubscribe(ws.data.uuid);
    },
  },
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const uuid = url.searchParams.get("uuid") ?? "";
      if (isUUIDv7(uuid)) {
        const upgraded = server.upgrade(req, {
          data: { uuid },
        });
        if (!upgraded) {
          return new Response("Upgrade failed", { status: 400 });
        }
        return new Response("Hello World");
      } else {
        return new Response("", { status: 422 });
      }
    }
    return new Response("Not Found", { status: 404 });
  },
});

new Cron("0 * * * * *", () => {
  clean.run();
});
