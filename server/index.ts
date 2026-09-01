import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { sessionMiddleware } from "./auth";
import { ensureDefaultGroups } from "./domain";
import { runMigrations } from "./migrate";
import { api } from "./routes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(sessionMiddleware);

  app.use("/api", api);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // In production, serve the built React app.
  if (process.env.NODE_ENV === "production") {
    const publicDir = path.resolve(__dirname, "public");
    app.use(express.static(publicDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicDir, "index.html"));
    });
  }

  // Central error handler (zod validation and unexpected errors).
  app.use(
    (err: any, _req: express.Request, res: express.Response, _next: any) => {
      if (err?.name === "ZodError") {
        res.status(400).json({ error: "Invalid request", details: err.issues });
        return;
      }
      console.error("[api] Unhandled error:", err);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  await runMigrations();
  await ensureDefaultGroups();

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`[server] HT Meetings listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
