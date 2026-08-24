import { NextFunction, Request, Response, Router } from "express";
import { createVm, isValidVmName } from "./create";
import { forceOff, getDomain, listDomains, reboot, remove, shutdown, start, vncDisplay } from "./domains";
import { CATALOG } from "./images";

function requireValidName(req: Request, res: Response, next: NextFunction): void {
  if (!isValidVmName(req.params.name)) {
    res.status(400).send("Nom de VM invalide.");
    return;
  }
  next();
}

export function buildRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const domains = await listDomains();
      const withVnc = await Promise.all(
        domains.map(async (d) => ({ ...d, vnc: d.state === "running" ? await vncDisplay(d.name) : null })),
      );
      res.render("qemu-index", {
        domains: withVnc,
        message: typeof req.query.message === "string" ? req.query.message : null,
        error: typeof req.query.error === "string" ? req.query.error : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/new", (req, res) => {
    res.render("qemu-new", { catalog: CATALOG, error: null, values: {} });
  });

  router.post("/new", async (req, res) => {
    const body = req.body;
    const input = {
      name: String(body.name || "").trim(),
      baseImageId: String(body.baseImageId || ""),
      vcpus: Number(body.vcpus) || 1,
      memoryMiB: Number(body.memoryMiB) || 1024,
      diskSizeGiB: Number(body.diskSizeGiB) || 10,
      sshUsername: String(body.sshUsername || "").trim(),
      sshPublicKey: String(body.sshPublicKey || "").trim(),
    };

    if (!input.sshUsername || !input.sshPublicKey) {
      res.status(400).render("qemu-new", {
        catalog: CATALOG,
        error: "Le nom d'utilisateur et la clé SSH publique sont obligatoires.",
        values: input,
      });
      return;
    }

    try {
      await createVm(input);
      res.redirect("/modules/qemu?message=" + encodeURIComponent(`VM "${input.name}" créée et démarrée.`));
    } catch (error) {
      res.status(400).render("qemu-new", {
        catalog: CATALOG,
        error: error instanceof Error ? error.message : "Erreur inconnue.",
        values: input,
      });
    }
  });

  router.post("/:name/start", requireValidName, async (req, res) => {
    try {
      await start(req.params.name);
      res.redirect("/modules/qemu");
    } catch (error) {
      res.redirect("/modules/qemu?error=" + encodeURIComponent(errorMessage(error)));
    }
  });

  router.post("/:name/shutdown", requireValidName, async (req, res) => {
    try {
      await shutdown(req.params.name);
      res.redirect("/modules/qemu");
    } catch (error) {
      res.redirect("/modules/qemu?error=" + encodeURIComponent(errorMessage(error)));
    }
  });

  router.post("/:name/destroy", requireValidName, async (req, res) => {
    try {
      await forceOff(req.params.name);
      res.redirect("/modules/qemu");
    } catch (error) {
      res.redirect("/modules/qemu?error=" + encodeURIComponent(errorMessage(error)));
    }
  });

  router.post("/:name/reboot", requireValidName, async (req, res) => {
    try {
      await reboot(req.params.name);
      res.redirect("/modules/qemu");
    } catch (error) {
      res.redirect("/modules/qemu?error=" + encodeURIComponent(errorMessage(error)));
    }
  });

  router.post("/:name/delete", requireValidName, async (req, res) => {
    try {
      const domain = await getDomain(req.params.name);
      await remove(req.params.name, domain?.diskPath ?? null);
      res.redirect("/modules/qemu?message=" + encodeURIComponent(`VM "${req.params.name}" supprimée.`));
    } catch (error) {
      res.redirect("/modules/qemu?error=" + encodeURIComponent(errorMessage(error)));
    }
  });

  return router;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}
