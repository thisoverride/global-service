import { Router } from "express";
import { getStatus, powerAction, serviceAction } from "./machine";
import { HLS_BASE, PLAYBACK_BASE, STREAM_PATH, getState, listRecordings, setRecording } from "./stream";
import { sshBinary } from "./ssh";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

function flash(req: { query: Record<string, unknown> }) {
  return {
    message: typeof req.query.message === "string" ? req.query.message : null,
    error: typeof req.query.error === "string" ? req.query.error : null,
  };
}

const back = (res: any, path: string, kind: "message" | "error", text: string) =>
  res.redirect(`/modules/smarthink${path}?${kind}=${encodeURIComponent(text)}`);

export function buildRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const [status, stream] = await Promise.all([getStatus(), getState()]);
      res.render("smarthink-index", { status, stream, ...flash(req) });
    } catch (error) {
      next(error);
    }
  });

  // ─── Relais du flux ────────────────────────────────────────────────────
  // Le navigateur ne peut pas joindre 192.168.1.44 depuis l'exterieur : la
  // console relaie donc le HLS, qui n'est que du HTTP. C'est aussi ce qui
  // place le flux derriere l'authentification de la console.
  router.get("/hls/*path", async (req, res) => {
    const rel = (req.params as { path?: string[] }).path?.join("/") ?? "";
    // Le chemin vient de l'URL : on interdit toute remontee d'arborescence.
    if (rel.includes("..")) {
      res.status(400).end();
      return;
    }
    try {
      // La chaine de requete porte le "session" que MediaMTX inscrit dans les
      // sous-playlists : la perdre casse la lecture apres le premier fichier.
      const qs = req.originalUrl.includes("?") ? "?" + req.originalUrl.split("?").slice(1).join("?") : "";
      // MediaMTX redirige une fois vers ?cookieCheck=1 ; fetch suit seul.
      const upstream = await fetch(`${HLS_BASE}/${STREAM_PATH}/${rel}${qs}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
      });
      res.status(upstream.status);
      const ct = upstream.headers.get("content-type");
      if (ct) res.setHeader("Content-Type", ct);
      // Un segment ou une playlist mis en cache figerait l'image en direct.
      res.setHeader("Cache-Control", "no-store");
      if (!upstream.body) {
        res.end();
        return;
      }
      const reader = upstream.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch {
      if (!res.headersSent) res.status(502);
      res.end();
    }
  });

  // ─── Capture d'image ───────────────────────────────────────────────────
  router.get("/snapshot", async (req, res) => {
    try {
      // Capture depuis le flux RTSP deja publie, et non depuis /dev/video0 :
      // la camera n'accepte qu'un seul lecteur a la fois, ouvrir le
      // peripherique couperait la diffusion en cours.
      const jpeg = await sshBinary(
        `ffmpeg -hide_banner -loglevel error -rtsp_transport tcp ` +
          `-i rtsp://127.0.0.1:8554/${STREAM_PATH} -frames:v 1 -q:v 3 -f image2 -`,
        25000,
      );
      if (jpeg.length === 0) throw new Error("capture vide");
      const name = `webcam-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
      res.send(jpeg);
    } catch (error) {
      back(res, "", "error", `Capture impossible : ${message(error)}`);
    }
  });

  // ─── Enregistrements ───────────────────────────────────────────────────
  router.get("/recordings", async (req, res, next) => {
    try {
      res.render("smarthink-recordings", { recordings: await listRecordings(), ...flash(req) });
    } catch (error) {
      next(error);
    }
  });

  // MediaMTX reassemble les segments a la demande via son serveur de
  // relecture ; la console se contente de relayer, ce qui evite de copier
  // des fichiers video sur le serveur.
  router.get("/recording", async (req, res) => {
    const start = String(req.query.start || "");
    if (!start) {
      back(res, "/recordings", "error", "Enregistrement non precise.");
      return;
    }
    try {
      const url = `${PLAYBACK_BASE}/get?path=${STREAM_PATH}&start=${encodeURIComponent(start)}&format=mp4`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!upstream.ok || !upstream.body) throw new Error(`MediaMTX a repondu ${upstream.status}`);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="webcam-${start.replace(/[:.]/g, "-")}.mp4"`);
      const reader = upstream.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (error) {
      if (!res.headersSent) back(res, "/recordings", "error", `Téléchargement impossible : ${message(error)}`);
      else res.end();
    }
  });

  router.post("/record", async (req, res) => {
    const on = req.body.state === "on";
    try {
      await setRecording(on);
      back(res, "", "message", on ? "Enregistrement demarre." : "Enregistrement arrete.");
    } catch (error) {
      back(res, "", "error", message(error));
    }
  });

  // ─── Service et machine ────────────────────────────────────────────────
  router.post("/service/:action", async (req, res) => {
    const action = req.params.action;
    if (action !== "start" && action !== "stop" && action !== "restart") {
      back(res, "", "error", "Action inconnue.");
      return;
    }
    try {
      await serviceAction(action);
      back(res, "", "message", `Service ${action === "start" ? "démarré" : action === "stop" ? "arrêté" : "redémarré"}.`);
    } catch (error) {
      back(res, "", "error", message(error));
    }
  });

  router.post("/power/:action", async (req, res) => {
    const action = req.params.action;
    if (action !== "reboot" && action !== "poweroff") {
      back(res, "", "error", "Action inconnue.");
      return;
    }
    await powerAction(action);
    back(res, "", "message", action === "reboot" ? "Redémarrage demandé." : "Extinction demandée.");
  });

  return router;
}
