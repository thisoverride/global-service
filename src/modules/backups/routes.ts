import { Router } from "express";
import { getReport } from "./status";
import { LOG_DIR, listLogs, readLog } from "./logs";

export function buildRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const [report, logs] = await Promise.all([getReport(), listLogs()]);
      res.render("backups-index", { ...report, logs });
    } catch (error) {
      next(error);
    }
  });

  router.get("/logs", async (req, res, next) => {
    try {
      res.render("backups-logs", { logs: await listLogs(), logDir: LOG_DIR });
    } catch (error) {
      next(error);
    }
  });

  router.get("/logs/:name", async (req, res, next) => {
    try {
      const log = await readLog(req.params.name);
      if (!log) {
        // Nom invalide ou fichier absent : meme reponse dans les deux cas, on
        // ne renseigne pas sur ce qui existe.
        res.status(404).render("backups-logs", {
          logs: await listLogs(),
          logDir: LOG_DIR,
          error: "Journal introuvable.",
        });
        return;
      }
      res.render("backups-log", { log, logs: await listLogs() });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
