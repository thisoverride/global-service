import { NextFunction, Request, Response, Router } from "express";
import { fetchRecentLogs, getContainerDetail, listContainers, streamLogs, stripAnsi } from "./docker";

const ID_PATTERN = /^[a-f0-9]{12,64}$/;

function requireValidId(req: Request, res: Response, next: NextFunction): void {
  if (!ID_PATTERN.test(req.params.id)) {
    res.status(400).send("Identifiant de conteneur invalide.");
    return;
  }
  next();
}

export function buildRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const showAll = req.query.all === "1";
      const containers = await listContainers(showAll);
      res.render("logs-index", { containers, showAll });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", requireValidId, async (req, res, next) => {
    try {
      const container = await getContainerDetail(req.params.id);
      if (!container) {
        res.status(404).send("Conteneur introuvable.");
        return;
      }
      const initialLogs = await fetchRecentLogs(req.params.id, 300);
      res.render("logs-view", { container, initialLogs });
    } catch (error) {
      next(error);
    }
  });

  // Diffusion en direct (SSE) — meme session que le reste de la console,
  // EventSource envoie le cookie automatiquement en same-origin.
  router.get("/:id/stream", requireValidId, async (req, res) => {
    let stream;
    try {
      stream = await streamLogs(req.params.id);
    } catch (error) {
      res.status(404).end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let buffer = "";
    stream.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        res.write(`data: ${JSON.stringify(stripAnsi(line))}\n\n`);
      }
    });
    stream.on("end", () => res.end());
    stream.on("error", () => res.end());

    req.on("close", () => {
      stream.destroy();
    });
  });

  return router;
}
