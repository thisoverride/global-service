import { Router } from "express";
import { Catalog, Job, MediaItem, VaultError, archive, getArchives, getCatalog, getJobs, poster, restore } from "./client";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

function flash(req: { query: Record<string, unknown> }) {
  return {
    message: typeof req.query.message === "string" ? req.query.message : null,
    error: typeof req.query.error === "string" ? req.query.error : null,
  };
}

// Les formulaires renvoient la chaine de requete de la liste pour revenir sur
// les memes filtres ; on n'accepte qu'une chaine de requete, jamais une URL.
function back(res: any, filters: unknown, kind: "message" | "error", text: string) {
  const params = new URLSearchParams(typeof filters === "string" && filters.startsWith("?") ? filters.slice(1) : "");
  params.delete("message");
  params.delete("error");
  params.set(kind, text);
  res.redirect(`/modules/media?${params}`);
}

export function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let n = bytes;
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: n < 10 && i > 2 ? 1 : 0 })} ${units[i]}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
}

export function seasonLabel(item: { season?: number | null }): string {
  if (item.season === 0) return "Spéciaux";
  return typeof item.season === "number" ? `Saison ${item.season}` : "Saison ?";
}

const STATES = ["local", "archived", "missing"] as const;
const SORTS = ["title", "size", "added"] as const;

function filterItems(catalog: Catalog, query: Record<string, unknown>) {
  const section = typeof query.section === "string" ? query.section : "";
  const state = STATES.find((s) => s === query.state) ?? "";
  const sort = SORTS.find((s) => s === query.sort) ?? "title";
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const needle = fold(q);

  let items = catalog.items.filter(
    (it) =>
      (!section || it.section === section) &&
      (!state || it.state === state) &&
      (!needle || fold(it.title).includes(needle)),
  );
  const byTitle = (a: MediaItem, b: MediaItem) =>
    a.title.localeCompare(b.title, "fr", { sensitivity: "base" }) || (a.season ?? 0) - (b.season ?? 0);
  items = items.sort(
    sort === "size"
      ? (a, b) => b.size - a.size
      : sort === "added"
        ? (a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)
        : byTitle,
  );
  return { items, filters: { section, state, sort, q } };
}

function totals(items: MediaItem[]) {
  const sum = (list: MediaItem[], f: (i: MediaItem) => number) => list.reduce((n, i) => n + f(i), 0);
  const local = items.filter((i) => i.state === "local");
  const archived = items.filter((i) => i.state === "archived");
  return {
    local: { count: local.length, size: sum(local, (i) => i.size) },
    archived: { count: archived.length, size: sum(archived, (i) => i.zipSize ?? 0) },
    missing: items.filter((i) => i.state === "missing").length,
  };
}

export function buildRouter(): Router {
  const router = Router();
  const helpers = { formatSize, formatDate, seasonLabel };

  router.get("/", async (req, res, next) => {
    try {
      let catalog: Catalog | null = null;
      let jobs: Job[] = [];
      let problem: string | null = null;
      try {
        [catalog, jobs] = await Promise.all([getCatalog(req.query.refresh === "1"), getJobs()]);
      } catch (error) {
        if (!(error instanceof VaultError)) throw error;
        problem = error.message;
      }
      const { items, filters } = catalog ? filterItems(catalog, req.query) : { items: [], filters: {} };
      const dayAgo = Date.now() - 24 * 3600 * 1000;
      const recentJobs = jobs.filter(
        (j) => j.status === "queued" || j.status === "running" || (j.finished_at && Date.parse(j.finished_at) > dayAgo),
      );
      res.render("media-index", {
        problem,
        sections: catalog ? [...new Set(catalog.items.map((i) => i.section))].sort((a, b) => a.localeCompare(b, "fr")) : [],
        items,
        filters,
        totals: totals(catalog?.items ?? []),
        jobs: recentJobs.slice(0, 8),
        queryString: req.originalUrl.includes("?") ? "?" + req.originalUrl.split("?")[1] : "",
        ...helpers,
        ...flash(req),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/jobs.json", async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json(await getJobs());
    } catch (error) {
      res.status(502).json({ error: message(error) });
    }
  });

  router.post("/archive", async (req, res) => {
    try {
      await archive(String(req.body.key || ""));
      back(res, req.body.filters, "message", `« ${req.body.title || "Élément"} » ajouté à la file d'archivage.`);
    } catch (error) {
      back(res, req.body.filters, "error", message(error));
    }
  });

  router.post("/restore", async (req, res) => {
    try {
      await restore(Number(req.body.id));
      back(res, req.body.filters, "message", `« ${req.body.title || "Élément"} » ajouté à la file de récupération.`);
    } catch (error) {
      back(res, req.body.filters, "error", message(error));
    }
  });

  // Jaquettes : Plex n'est pas joignable depuis le navigateur, et une fois
  // l'element archive Plex peut l'avoir oublie ; le service garde alors la
  // sienne.
  router.get("/poster", async (req, res) => {
    const thumb = typeof req.query.thumb === "string" ? req.query.thumb : "";
    const archiveId = Number(req.query.archive);
    const path = thumb.startsWith("/library/metadata/")
      ? `/poster?thumb=${encodeURIComponent(thumb)}`
      : Number.isInteger(archiveId) && archiveId > 0
        ? `/poster/archive/${archiveId}`
        : null;
    if (!path) {
      res.status(400).end();
      return;
    }
    try {
      const upstream = await poster(path);
      if (!upstream.ok) {
        res.status(404).end();
        return;
      }
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.status(502).end();
    }
  });

  router.get("/history", async (req, res, next) => {
    try {
      let problem: string | null = null;
      let archives: Awaited<ReturnType<typeof getArchives>> = [];
      let jobs: Job[] = [];
      try {
        [archives, jobs] = await Promise.all([getArchives(), getJobs()]);
      } catch (error) {
        if (!(error instanceof VaultError)) throw error;
        problem = error.message;
      }
      res.render("media-history", { problem, archives, jobs, ...helpers, ...flash(req) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
