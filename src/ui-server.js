import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getAuthenticatedUser, handleAuthRequest } from "./auth.js";
import { connectToDatabase } from "./db.js";
import { handleGenerationRequest } from "./generation-api.js";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const uiRoot = resolve(projectRoot, "ui");
const port = Number(process.env.UI_PORT ?? 4173);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

createServer(async (request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  if (pathname === "/api/config" && request.method === "GET") {
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(JSON.stringify({ authPreview: process.env.AUTH_PREVIEW === "true", liveGeneration: process.env.AUTH_PREVIEW !== "true" }));
    return;
  }

  if (pathname === "/api/videos/latest" && request.method === "GET") {
    try {
      const user = await getAuthenticatedUser(request);
      if (!user) {
        response.writeHead(401, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        response.end(JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Sign in to view your videos." } }));
        return;
      }
      const db = await connectToDatabase();
      const job = await db.collection("generation_jobs").findOne({ userId: user._id, status: "succeeded" }, { sort: { createdAt: -1 } });
      if (!job) {
        response.writeHead(404, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        response.end(JSON.stringify({ error: { code: "VIDEO_NOT_FOUND", message: "No rendered video was found." } }));
        return;
      }
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ title: job.topic, url: `/api/generations/${job._id}/video` }));
    } catch {
      response.writeHead(503, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: { code: "VIDEO_LOOKUP_FAILED", message: "Could not find a rendered video." } }));
    }
    return;
  }

  if (pathname.startsWith("/api/generations")) {
    await handleGenerationRequest(request, response, pathname);
    return;
  }

  if (pathname.startsWith("/api/auth/")) {
    if (process.env.AUTH_PREVIEW === "true") {
      response.writeHead(503, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify({ error: { code: "AUTH_PREVIEW", message: "Authentication is disabled in UI preview mode." } }));
      return;
    }
    await handleAuthRequest(request, response, pathname);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  const pageRoutes = new Set(["/login", "/signup", "/reset"]);
  const relativePath = pathname === "/" || pageRoutes.has(pathname)
    ? "index.html"
    : pathname.replace(/^\/+/, "");
  const filePath = resolve(uiRoot, relativePath);
  if (filePath !== uiRoot && !filePath.startsWith(`${uiRoot}${sep}`)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const contentType = mimeTypes[extname(filePath)];
  if (!contentType) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath)
    .on("error", () => {
      if (!response.headersSent) response.writeHead(404);
      response.end("Not found");
    })
    .pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`VideoReel UI preview running at http://127.0.0.1:${port}`);
  console.log(`Email/password auth and live generation are ${process.env.AUTH_PREVIEW === "true" ? "disabled" : "enabled"}.`);
});
