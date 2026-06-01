#!/usr/bin/env bun
import { Cron } from "croner";
import packageJson from "../package.json";
import { clean, flush, getResults, getResultsByStep, vote } from "./db";
import indexPage from "./layout/index.html" with { type: "text" };
import manyPage from "./layout/many.html" with { type: "text" };
import resultPage from "./layout/result.html" with { type: "text" };
import votePage from "./layout/vote.html" with { type: "text" };
import dynamicVotePage from "./layout/dynamic-vote.html" with { type: "text" };
import dynamicManyPage from "./layout/dynamic-many.html" with { type: "text" };
import dynamicResultPage from "./layout/dynamic-result.html" with { type: "text" };

type WebSocketData = {
  uuid: string;
  kind: "static" | "dynamic";
};

const dynamicPolls = new Map<string, Map<number, string[]>>();

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
  port: 3000,
  routes: {
    "/": () =>
      new Response(
        `${indexPage as unknown as string}`.replace(
          "#VERSION#",
          packageJson.version,
        ),
        {
          headers: {
            "Content-Type": "text/html",
          },
        },
      ),
    "/many": () =>
      new Response(manyPage as unknown as string, {
        headers: { "Content-Type": "text/html" },
      }),
    "/results": () =>
      new Response(resultPage as unknown as string, {
        headers: { "Content-Type": "text/html" },
      }),
    "/vote": () =>
      new Response(votePage as unknown as string, {
        headers: { "Content-Type": "text/html" },
      }),
    "/dynamic-vote": () =>
      new Response(dynamicVotePage as unknown as string, {
        headers: { "Content-Type": "text/html" },
      }),
    "/dynamic-many": () =>
      new Response(dynamicManyPage as unknown as string, {
        headers: { "Content-Type": "text/html" },
      }),
    "/dynamic-result": () =>
      new Response(dynamicResultPage as unknown as string, {
        headers: { "Content-Type": "text/html" },
      }),

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
          return new Response("", { status: 201, headers: corsHeaders });
        }
        return new Response("", { status: 422, headers: corsHeaders });
      },
    },

    "/api/vote/:uuid": (req) => {
      if (req.method === "OPTIONS")
        return new Response("", { status: 204, headers: corsHeaders });
      if (isUUIDv7(req.params.uuid)) {
        const url = new URL(req.url);
        const step = url.searchParams.get("step");
        const data =
          step !== null
            ? getResultsByStep.all({
                uuid: req.params.uuid,
                min: parseInt(step, 10) * 100,
                max: parseInt(step, 10) * 100 + 99,
              })
            : getResults.all(req.params.uuid);
        return Response.json(
          { result: data },
          { headers: corsHeaders },
        );
      }
      return new Response("", { status: 422, headers: corsHeaders });
    },

    "/api/dynamic/:uuid/step": {
      OPTIONS: () => new Response("", { status: 204, headers: corsHeaders }),
      POST: async (req) => {
        const uuid = req.params.uuid;
        if (!isUUIDv7(uuid)) {
          return new Response("", { status: 422, headers: corsHeaders });
        }
        const body = (await req.json()) as {
          step: number;
          choices: string[];
        };
        if (
          typeof body.step !== "number" ||
          !Array.isArray(body.choices) ||
          body.choices.length === 0
        ) {
          return new Response("", { status: 422, headers: corsHeaders });
        }
        if (!dynamicPolls.has(uuid)) {
          dynamicPolls.set(uuid, new Map());
        }
        dynamicPolls.get(uuid)!.set(body.step, body.choices);
        srv.publish(
          `dynamic:${uuid}`,
          JSON.stringify({
            type: "step",
            step: body.step,
            choices: body.choices,
          }),
        );
        return new Response("", { status: 201, headers: corsHeaders });
      },
      GET: (req) => {
        const uuid = req.params.uuid;
        if (!isUUIDv7(uuid)) {
          return new Response("", { status: 422, headers: corsHeaders });
        }
        const url = new URL(req.url);
        const step = parseInt(url.searchParams.get("step") ?? "", 10);
        if (isNaN(step)) {
          return new Response("", { status: 422, headers: corsHeaders });
        }
        const poll = dynamicPolls.get(uuid);
        const choices = poll?.get(step);
        if (!choices) {
          return new Response("", { status: 404, headers: corsHeaders });
        }
        return Response.json(
          { step, choices },
          { headers: corsHeaders },
        );
      },
    },

    "/styles/style.css": () =>
      new Response(Bun.file(`${import.meta.dir}/styles/style.css`)),
    "/scripts/script.js": () =>
      new Response(Bun.file(`${import.meta.dir}/scripts/script.js`)),
    "/scripts/many.js": () =>
      new Response(Bun.file(`${import.meta.dir}/scripts/many.js`)),
    "/scripts/vote.js": () =>
      new Response(Bun.file(`${import.meta.dir}/scripts/vote.js`)),
    "/scripts/result.js": () =>
      new Response(Bun.file(`${import.meta.dir}/scripts/result.js`)),
    "/scripts/dynamic-vote.js": () =>
      new Response(Bun.file(`${import.meta.dir}/scripts/dynamic-vote.js`)),
    "/scripts/dynamic-many.js": () =>
      new Response(Bun.file(`${import.meta.dir}/scripts/dynamic-many.js`)),
    "/scripts/dynamic-result.js": () =>
      new Response(Bun.file(`${import.meta.dir}/scripts/dynamic-result.js`)),
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
      if (ws.data.kind === "dynamic") {
        ws.subscribe(`dynamic:${ws.data.uuid}`);
        const poll = dynamicPolls.get(ws.data.uuid);
        if (poll) {
          const maxStep = Math.max(...poll.keys());
          const choices = poll.get(maxStep);
          if (choices) {
            ws.send(
              JSON.stringify({
                type: "step",
                step: maxStep,
                choices,
              }),
            );
            ws.send(
              JSON.stringify({
                type: "result",
                step: maxStep,
                result: getResultsByStep.all({
                  uuid: ws.data.uuid,
                  min: maxStep * 100,
                  max: maxStep * 100 + 99,
                }),
              }),
            );
          }
        }
      } else {
        ws.subscribe(ws.data.uuid);
        ws.send(
          JSON.stringify({ result: getResults.all(ws.data.uuid) }),
        );
      }
    },
    message: () => {},
    close: (ws) => {
      if (ws.data.kind === "dynamic") {
        ws.unsubscribe(`dynamic:${ws.data.uuid}`);
      } else {
        ws.unsubscribe(ws.data.uuid);
      }
    },
  },
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const uuid = url.searchParams.get("uuid") ?? "";
      if (isUUIDv7(uuid)) {
        const upgraded = server.upgrade(req, {
          data: { uuid, kind: "static" },
        });
        if (!upgraded) {
          return new Response("Upgrade failed", { status: 400 });
        }
        return new Response("Hello World");
      }
      return new Response("", { status: 422 });
    }
    if (url.pathname === "/ws/dynamic") {
      const uuid = url.searchParams.get("uuid") ?? "";
      if (isUUIDv7(uuid)) {
        const upgraded = server.upgrade(req, {
          data: { uuid, kind: "dynamic" },
        });
        if (!upgraded) {
          return new Response("Upgrade failed", { status: 400 });
        }
        return new Response("Hello World");
      }
      return new Response("", { status: 422 });
    }
    return new Response("Not Found", { status: 404 });
  },
});

new Cron("0 * * * * *", () => {
  clean.run();
});

console.log("Pollux is running on http://localhost:3000");
