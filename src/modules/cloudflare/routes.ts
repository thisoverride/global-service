import { Router } from "express";
import { Pool } from "pg";
import { getSetting, setSetting } from "../../core/db/moduleSettings";
import { manifest } from "./manifest";
import { CloudflareApiError, createRecord, deleteRecord, listRecords, listZones, updateRecord } from "./service";

const MODULE_ID = manifest.id;

async function getToken(pool: Pool): Promise<string | null> {
  return getSetting<string>(pool, MODULE_ID, "apiToken");
}

export function buildRouter(pool: Pool): Router {
  const router = Router();

  router.get("/settings", async (req, res) => {
    const token = await getToken(pool);
    res.render("cloudflare-settings", { hasToken: Boolean(token), error: null });
  });

  router.post("/settings", async (req, res) => {
    const token = String(req.body.apiToken || "").trim();
    if (!token) {
      res.status(400).render("cloudflare-settings", { hasToken: false, error: "Le jeton API est obligatoire." });
      return;
    }
    // Verifie le jeton avant de le stocker : evite d'enregistrer une valeur invalide.
    try {
      await listZones(token);
    } catch (error) {
      res.status(400).render("cloudflare-settings", {
        hasToken: false,
        error: error instanceof CloudflareApiError ? error.message : "Jeton invalide.",
      });
      return;
    }
    await setSetting(pool, MODULE_ID, "apiToken", token);
    res.redirect("/modules/cloudflare");
  });

  router.get("/", async (req, res, next) => {
    try {
      const token = await getToken(pool);
      if (!token) {
        res.redirect("/modules/cloudflare/settings");
        return;
      }
      const zones = await listZones(token);
      res.render("cloudflare-index", { zones });
    } catch (error) {
      next(error);
    }
  });

  router.get("/zones/:zoneId", async (req, res, next) => {
    try {
      const token = await getToken(pool);
      if (!token) {
        res.redirect("/modules/cloudflare/settings");
        return;
      }
      const [zones, records] = await Promise.all([listZones(token), listRecords(token, req.params.zoneId)]);
      const zone = zones.find((z) => z.id === req.params.zoneId);
      if (!zone) {
        res.status(404).send("Zone introuvable");
        return;
      }
      res.render("cloudflare-zone", { zone, records, error: null });
    } catch (error) {
      next(error);
    }
  });

  router.post("/zones/:zoneId/records", async (req, res, next) => {
    try {
      const token = await getToken(pool);
      if (!token) {
        res.redirect("/modules/cloudflare/settings");
        return;
      }
      const { type, name, content, ttl, proxied } = req.body;
      await createRecord(token, req.params.zoneId, {
        type,
        name,
        content,
        ttl: Number(ttl) || 1,
        proxied: proxied === "on",
      });
      res.redirect(`/modules/cloudflare/zones/${req.params.zoneId}`);
    } catch (error) {
      next(error);
    }
  });

  router.post("/zones/:zoneId/records/:recordId/update", async (req, res, next) => {
    try {
      const token = await getToken(pool);
      if (!token) {
        res.redirect("/modules/cloudflare/settings");
        return;
      }
      const { type, name, content, ttl, proxied } = req.body;
      await updateRecord(token, req.params.zoneId, req.params.recordId, {
        type,
        name,
        content,
        ttl: Number(ttl) || 1,
        proxied: proxied === "on",
      });
      res.redirect(`/modules/cloudflare/zones/${req.params.zoneId}`);
    } catch (error) {
      next(error);
    }
  });

  router.post("/zones/:zoneId/records/:recordId/delete", async (req, res, next) => {
    try {
      const token = await getToken(pool);
      if (!token) {
        res.redirect("/modules/cloudflare/settings");
        return;
      }
      await deleteRecord(token, req.params.zoneId, req.params.recordId);
      res.redirect(`/modules/cloudflare/zones/${req.params.zoneId}`);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
