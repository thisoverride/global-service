import { Router } from "express";
import { Pool } from "pg";
import { getSetting, setSetting } from "../../core/db/moduleSettings";
import {
  BboxError,
  checkPassword,
  createNatRule,
  deleteNatRule,
  getDeviceInfo,
  getWanInfo,
  listHosts,
  listNatRules,
} from "./client";

const PROTOCOLS = ["tcp", "udp"];
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

export function buildRouter(pool: Pool): Router {
  const router = Router();

  router.get("/settings", async (req, res) => {
    const password = await getSetting<string>(pool, "bbox", "password");
    res.render("bbox-settings", { hasPassword: Boolean(password), error: null });
  });

  router.post("/settings", async (req, res) => {
    const password = String(req.body.password || "");
    if (!password) {
      res.status(400).render("bbox-settings", { hasPassword: false, error: "Le mot de passe est obligatoire." });
      return;
    }
    // Verifie aupres de la box avant d'enregistrer : evite de stocker un
    // mot de passe faux qu'on ne decouvrirait qu'a la premiere utilisation.
    try {
      await checkPassword(password);
    } catch (error) {
      res.status(400).render("bbox-settings", { hasPassword: false, error: message(error) });
      return;
    }
    await setSetting(pool, "bbox", "password", password);
    res.redirect("/modules/bbox");
  });

  router.get("/", async (req, res, next) => {
    try {
      const [device, wan, rules] = await Promise.all([getDeviceInfo(), getWanInfo(), listNatRules()]);
      // Les appareils connectes demandent une session : on affiche le reste
      // meme sans mot de passe configure, plutot que de bloquer la page.
      let hosts = null;
      let hostsError: string | null = null;
      try {
        hosts = await listHosts(pool);
      } catch (error) {
        hostsError = message(error);
      }
      res.render("bbox-index", {
        device,
        wan,
        rules,
        hosts,
        hostsError,
        message: typeof req.query.message === "string" ? req.query.message : null,
        error: typeof req.query.error === "string" ? req.query.error : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/nat", async (req, res) => {
    const description = String(req.body.description || "").trim();
    const protocol = String(req.body.protocol || "");
    const externalPort = Number(req.body.externalPort);
    const internalPort = Number(req.body.internalPort);
    const internalIp = String(req.body.internalIp || "").trim();

    const invalid =
      !description ||
      !PROTOCOLS.includes(protocol) ||
      !Number.isInteger(externalPort) ||
      externalPort < 1 ||
      externalPort > 65535 ||
      !Number.isInteger(internalPort) ||
      internalPort < 1 ||
      internalPort > 65535 ||
      !IPV4_PATTERN.test(internalIp);

    if (invalid) {
      res.redirect("/modules/bbox?error=" + encodeURIComponent("Redirection invalide : vérifiez les ports et l'IP."));
      return;
    }

    try {
      await createNatRule(pool, { description, protocol, externalPort, internalPort, internalIp });
      res.redirect(
        "/modules/bbox?message=" + encodeURIComponent(`Redirection « ${description} » créée.`),
      );
    } catch (error) {
      res.redirect("/modules/bbox?error=" + encodeURIComponent(message(error)));
    }
  });

  router.post("/nat/:id/delete", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.redirect("/modules/bbox?error=" + encodeURIComponent("Identifiant de redirection invalide."));
      return;
    }
    try {
      await deleteNatRule(pool, id);
      res.redirect("/modules/bbox?message=" + encodeURIComponent("Redirection supprimée."));
    } catch (error) {
      res.redirect("/modules/bbox?error=" + encodeURIComponent(message(error)));
    }
  });

  return router;
}
