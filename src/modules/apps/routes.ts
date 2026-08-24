import { Router } from "express";
import { discover } from "./discover";

export function buildRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { byDomain, byPort, lanHostConfigured } = await discover();
      res.render("apps-index", { byDomain, byPort, lanHostConfigured });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
