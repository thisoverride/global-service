import { Router } from "express";
import { Pool } from "pg";
import { AttemptFilter, getAttemptPage, getStats } from "../../core/auth/loginAttempts";

const PER_PAGE = 50;

function readFilter(value: unknown): AttemptFilter {
  return value === "success" || value === "failed" ? value : "all";
}

// Un numero de page absent, negatif ou non numerique retombe sur 1 plutot que
// de produire un OFFSET aberrant.
function readPage(value: unknown): number {
  const page = Number.parseInt(String(value ?? "1"), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function buildRouter(pool: Pool): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const filter = readFilter(req.query.filter);
      const page = readPage(req.query.page);

      const [{ attempts, total }, stats] = await Promise.all([
        getAttemptPage(pool, filter, PER_PAGE, (page - 1) * PER_PAGE),
        getStats(pool),
      ]);

      const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
      res.render("logins-index", {
        attempts,
        stats,
        filter,
        total,
        page: Math.min(page, pageCount),
        pageCount,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
