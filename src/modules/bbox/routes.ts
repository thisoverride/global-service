import { Router } from "express";
import { Pool } from "pg";
import { getSetting, setSetting } from "../../core/db/moduleSettings";
import {
  checkPassword,
  createNatRule,
  deleteNatRule,
  getDeviceInfo,
  getNatRule,
  getWanInfo,
  listHosts,
  listNatRules,
  setNatRuleEnabled,
  updateNatRule,
} from "./client";

const PROTOCOLS = ["tcp", "udp"];
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

interface ParsedRule {
  description: string;
  protocol: string;
  externalPort: number;
  internalPort: number;
  internalIp: string;
}

// Valide entierement la saisie avant tout appel a la box : une regle
// incoherente y serait acceptee telle quelle et ouvrirait un port sans
// que ce soit visible.
function parseRuleForm(body: Record<string, unknown>): ParsedRule | null {
  const description = String(body.description || "").trim();
  const protocol = String(body.protocol || "");
  const externalPort = Number(body.externalPort);
  const internalPort = Number(body.internalPort);
  const internalIp = String(body.internalIp || "").trim();

  const portOk = (p: number) => Number.isInteger(p) && p >= 1 && p <= 65535;
  const ipOk =
    IPV4_PATTERN.test(internalIp) &&
    internalIp.split(".").every((octet) => Number(octet) <= 255);

  if (!description || !PROTOCOLS.includes(protocol) || !portOk(externalPort) || !portOk(internalPort) || !ipOk) {
    return null;
  }
  return { description, protocol, externalPort, internalPort, internalIp };
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

  function flash(req: { query: Record<string, unknown> }) {
    return {
      message: typeof req.query.message === "string" ? req.query.message : null,
      error: typeof req.query.error === "string" ? req.query.error : null,
    };
  }

  router.get("/", async (req, res, next) => {
    try {
      const [device, wan, rules] = await Promise.all([getDeviceInfo(), getWanInfo(), listNatRules()]);
      // Le nombre d'appareils demande une session : la vue d'ensemble reste
      // consultable sans mot de passe, ce compteur affiche alors un tiret.
      const hostCount = await listHosts(pool)
        .then((hosts) => hosts.filter((h) => h.active).length)
        .catch(() => null);

      res.render("bbox-index", { device, wan, ruleCount: rules.length, hostCount, ...flash(req) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/hosts", async (req, res, next) => {
    try {
      const hosts = await listHosts(pool);
      res.render("bbox-hosts", { hosts, hostsError: null, ...flash(req) });
    } catch (error) {
      // Mot de passe absent ou refusé : on l'explique plutôt que d'afficher
      // une page d'erreur générique.
      res.render("bbox-hosts", { hosts: [], hostsError: message(error), ...flash(req) });
    }
  });

  router.get("/nat", async (req, res, next) => {
    try {
      const rules = await listNatRules();
      res.render("bbox-nat", { rules, ...flash(req) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/nat", async (req, res) => {
    const rule = parseRuleForm(req.body);
    if (!rule) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent("Redirection invalide : vérifiez les ports et l'IP."));
      return;
    }
    try {
      await createNatRule(pool, rule);
      res.redirect("/modules/bbox/nat?message=" + encodeURIComponent(`Redirection « ${rule.description} » créée.`));
    } catch (error) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent(message(error)));
    }
  });

  router.get("/nat/:id/edit", async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent("Identifiant de redirection invalide."));
      return;
    }
    try {
      const rule = await getNatRule(id);
      if (!rule) {
        res.redirect("/modules/bbox/nat?error=" + encodeURIComponent("Redirection introuvable."));
        return;
      }
      res.render("bbox-nat-edit", { rule, error: null });
    } catch (error) {
      next(error);
    }
  });

  router.post("/nat/:id/edit", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent("Identifiant de redirection invalide."));
      return;
    }
    const parsed = parseRuleForm(req.body);
    if (!parsed) {
      const current = await getNatRule(id).catch(() => null);
      res.status(400).render("bbox-nat-edit", {
        rule: current ?? { id, description: "", protocol: "tcp", externalPort: "", internalPort: "", internalIp: "", enabled: true },
        error: "Redirection invalide : vérifiez les ports et l'IP.",
      });
      return;
    }
    try {
      await updateNatRule(pool, id, parsed);
      res.redirect("/modules/bbox/nat?message=" + encodeURIComponent(`Redirection « ${parsed.description} » modifiée.`));
    } catch (error) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent(message(error)));
    }
  });

  router.post("/nat/:id/toggle", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent("Identifiant de redirection invalide."));
      return;
    }
    const enable = req.body.enable === "1";
    try {
      await setNatRuleEnabled(pool, id, enable);
      res.redirect(
        "/modules/bbox/nat?message=" + encodeURIComponent(enable ? "Redirection activée." : "Redirection désactivée."),
      );
    } catch (error) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent(message(error)));
    }
  });

  router.post("/nat/:id/delete", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent("Identifiant de redirection invalide."));
      return;
    }
    try {
      await deleteNatRule(pool, id);
      res.redirect("/modules/bbox/nat?message=" + encodeURIComponent("Redirection supprimée."));
    } catch (error) {
      res.redirect("/modules/bbox/nat?error=" + encodeURIComponent(message(error)));
    }
  });

  return router;
}
