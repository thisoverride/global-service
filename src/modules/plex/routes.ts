import { Router } from "express";
import { Pool } from "pg";
import { getSetting, setSetting } from "../../core/db/moduleSettings";
import { checkToken, getLibraries, getServerInfo, getSessions } from "./client";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

export function buildRouter(pool: Pool): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      // La version et la mise à jour ne demandent pas de jeton : la page
      // reste utile même sans configuration.
      res.render("plex-index", { server: await getServerInfo(), loadError: null });
    } catch (error) {
      res.render("plex-index", { server: null, loadError: message(error) });
    }
  });

  router.get("/libraries", async (req, res) => {
    try {
      res.render("plex-libraries", { libraries: await getLibraries(pool), loadError: null });
    } catch (error) {
      res.render("plex-libraries", { libraries: [], loadError: message(error) });
    }
  });

  router.get("/sessions", async (req, res) => {
    try {
      res.render("plex-sessions", { sessions: await getSessions(pool), loadError: null });
    } catch (error) {
      res.render("plex-sessions", { sessions: [], loadError: message(error) });
    }
  });

  router.get("/settings", async (req, res) => {
    const t = await getSetting<string>(pool, "plex", "token");
    res.render("plex-settings", { hasToken: Boolean(t), error: null });
  });

  router.post("/settings", async (req, res) => {
    const candidate = String(req.body.token || "").trim();
    if (!candidate) {
      res.status(400).render("plex-settings", { hasToken: false, error: "Le jeton est obligatoire." });
      return;
    }
    try {
      await checkToken(candidate);
    } catch (error) {
      res.status(400).render("plex-settings", { hasToken: false, error: message(error) });
      return;
    }
    await setSetting(pool, "plex", "token", candidate);
    res.redirect("/modules/plex");
  });

  return router;
}
