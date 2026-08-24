import { Router } from "express";
import { publishImport, queueDepth, recipeCount, SUPPORTED_DOMAINS } from "./service";

export function buildRouter(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const [pending, count] = await Promise.all([queueDepth(), recipeCount()]);
    res.render("eustass-index", {
      supportedDomains: SUPPORTED_DOMAINS,
      pending,
      count,
      message: typeof req.query.message === "string" ? req.query.message : null,
      error: typeof req.query.error === "string" ? req.query.error : null,
    });
  });

  router.post("/import", async (req, res) => {
    const urls = String(req.body.urls || "")
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      res.redirect("/modules/eustass?error=" + encodeURIComponent("Ajoute au moins un lien."));
      return;
    }
    if (urls.length > 20) {
      res.redirect("/modules/eustass?error=" + encodeURIComponent("Maximum 20 liens à la fois."));
      return;
    }

    try {
      const result = await publishImport(urls);
      if (result.queued === 0) {
        res.redirect("/modules/eustass?error=" + encodeURIComponent(`Aucun lien exploitable (${result.rejected.length} ignoré·s).`));
        return;
      }
      let message = `${result.queued} recette(s) en cours d'import.`;
      if (result.rejected.length) message += ` ${result.rejected.length} ignoré(s).`;
      res.redirect("/modules/eustass?message=" + encodeURIComponent(message));
    } catch (error) {
      res.redirect(
        "/modules/eustass?error=" +
          encodeURIComponent(`File indisponible : ${error instanceof Error ? error.message : "erreur inconnue"}`),
      );
    }
  });

  return router;
}
