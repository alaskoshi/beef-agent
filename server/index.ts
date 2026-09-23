import http from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { coach } from "./coach";
const port = Number(process.env.PORT || 4173);
const host = `127.0.0.1:${port}`;
const vite =
  process.env.NODE_ENV === "production"
    ? null
    : await (
        await import("vite")
      ).createServer({ server: { middlewareMode: true }, appType: "spa" });
let busy = false;
http
  .createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.headers.host !== host) {
      res.writeHead(403);
      res.end("Loopback host required");
      return;
    }
    if (req.url === "/api/coach") {
      if (
        req.method !== "POST" ||
        req.headers.origin !== `http://${host}` ||
        !req.headers["content-type"]?.startsWith("application/json")
      ) {
        res.writeHead(403);
        res.end("Same-origin JSON POST required");
        return;
      }
      if (busy) {
        res.writeHead(429);
        res.end("One corner request at a time");
        return;
      }
      busy = true;
      const cancel = new AbortController();
      res.on("close", () => cancel.abort());
      try {
        let data = "";
        for await (const chunk of req) {
          data += chunk;
          if (Buffer.byteLength(data) > 20000) throw Error("Request too large");
        }
        const body = JSON.parse(data);
        if (
          body.mode !== "rules" &&
          body.mode !== "model" &&
          body.mode !== "bedrock"
        )
          throw Error("Unknown trainer mode");
        const result = await coach(body.input, body.mode, cancel.signal);
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(result));
      } catch (e) {
        if (!res.destroyed) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : "Trainer unavailable",
            }),
          );
        }
      } finally {
        busy = false;
      }
      return;
    }
    if (req.url === "/api/status") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          modelConfigured: Boolean(process.env.LOCAL_MODEL),
          x: "unverified",
        }),
      );
      return;
    }
    if (vite) {
      vite.middlewares(req, res);
      return;
    }
    try {
      const path = decodeURIComponent((req.url || "/").split("?")[0]);
      const file = resolve("dist", path === "/" ? "index.html" : "." + path);
      if (!file.startsWith(resolve("dist") + "/")) throw Error("Invalid path");
      const actual = await realpath(file);
      if (!actual.startsWith((await realpath("dist")) + "/"))
        throw Error("Invalid path");
      const data = await readFile(actual);
      res.setHeader(
        "Content-Type",
        (
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
          } as Record<string, string>
        )[extname(file)] || "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`agentic.beef http://${host} · local only`),
  );
