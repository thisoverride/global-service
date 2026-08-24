import { Router } from "express";
import { getReport } from "./status";

export function buildRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      res.render("backups-index", await getReport());
    } catch (error) {
      next(error);
    }
  });

  return router;
}
