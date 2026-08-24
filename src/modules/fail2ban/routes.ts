import { Router } from "express";
import { banIp, getJail, getOverview, unbanIp } from "./client";

// Accepte IPv4 et IPv6 : fail2ban bannit les deux, un filtre IPv4 seul
// rendrait le module inutilisable le jour où une attaque arrive en IPv6.
const IP_PATTERN = /^[0-9a-fA-F:.]{3,45}$/;
const JAIL_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

function flash(req: { query: Record<string, unknown> }) {
  return {
    message: typeof req.query.message === "string" ? req.query.message : null,
    error: typeof req.query.error === "string" ? req.query.error : null,
  };
}

export function buildRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const { version, jails } = await getOverview();
      res.render("fail2ban-index", { version, jails, loadError: null, ...flash(req) });
    } catch (error) {
      res.render("fail2ban-index", { version: null, jails: [], loadError: message(error), ...flash(req) });
    }
  });

  router.get("/jail/:name", async (req, res) => {
    if (!JAIL_PATTERN.test(req.params.name)) {
      res.redirect("/modules/fail2ban?error=" + encodeURIComponent("Nom de jail invalide."));
      return;
    }
    try {
      const jail = await getJail(req.params.name);
      res.render("fail2ban-jail", { jail, ...flash(req) });
    } catch (error) {
      // Socket injoignable ou jail disparue : on l'explique sur la page
      // d'accueil du module plutôt que d'afficher une erreur serveur nue.
      res.redirect("/modules/fail2ban?error=" + encodeURIComponent(message(error)));
    }
  });

  router.post("/jail/:name/ban", async (req, res) => {
    const jail = req.params.name;
    const ip = String(req.body.ip || "").trim();
    if (!JAIL_PATTERN.test(jail) || !IP_PATTERN.test(ip)) {
      res.redirect(`/modules/fail2ban/jail/${encodeURIComponent(jail)}?error=` + encodeURIComponent("Adresse IP invalide."));
      return;
    }
    try {
      await banIp(jail, ip);
      res.redirect(`/modules/fail2ban/jail/${encodeURIComponent(jail)}?message=` + encodeURIComponent(`${ip} bannie.`));
    } catch (error) {
      res.redirect(`/modules/fail2ban/jail/${encodeURIComponent(jail)}?error=` + encodeURIComponent(message(error)));
    }
  });

  router.post("/jail/:name/unban", async (req, res) => {
    const jail = req.params.name;
    const ip = String(req.body.ip || "").trim();
    if (!JAIL_PATTERN.test(jail) || !IP_PATTERN.test(ip)) {
      res.redirect(`/modules/fail2ban/jail/${encodeURIComponent(jail)}?error=` + encodeURIComponent("Adresse IP invalide."));
      return;
    }
    try {
      await unbanIp(jail, ip);
      res.redirect(`/modules/fail2ban/jail/${encodeURIComponent(jail)}?message=` + encodeURIComponent(`${ip} débannie.`));
    } catch (error) {
      res.redirect(`/modules/fail2ban/jail/${encodeURIComponent(jail)}?error=` + encodeURIComponent(message(error)));
    }
  });

  return router;
}
