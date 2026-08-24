import { Response, Request } from "express";
import { inject, injectable } from "inversify";
import { GET, POST } from "../framework/express/hotspring/hotSpring";
import { verifyCredentials } from "../core/auth/users";
import { DB_POOL } from "../core/db/token";
import type { Pool } from "pg";

@injectable()
export default class AuthController {
  constructor(@inject(DB_POOL) private readonly _pool: Pool) {}

  @GET("/login")
  public async renderLogin(request: Request, response: Response): Promise<void> {
    if (request.session.userId) {
      response.redirect("/");
      return;
    }
    response.render("pages/Login", {
      layout: false,
      next: typeof request.query.next === "string" ? request.query.next : "/",
    });
  }

  @POST("/login")
  public async handleLogin(request: Request, response: Response): Promise<void> {
    const username = String(request.body.username || "").trim();
    const password = String(request.body.password || "");
    const next = typeof request.body.next === "string" && request.body.next.startsWith("/")
      ? request.body.next
      : "/";

    const user = await verifyCredentials(this._pool, username, password);
    if (!user) {
      response.status(401).render("pages/Login", {
        layout: false,
        next,
        error: "Identifiants incorrects.",
      });
      return;
    }

    request.session.regenerate((err) => {
      if (err) {
        response.status(500).render("pages/Login", { layout: false, next, error: "Erreur serveur." });
        return;
      }
      request.session.userId = user.id;
      request.session.username = user.username;
      request.session.save(() => response.redirect(next));
    });
  }

  @POST("/logout")
  public async handleLogout(request: Request, response: Response): Promise<void> {
    request.session.destroy(() => response.redirect("/login"));
  }
}
