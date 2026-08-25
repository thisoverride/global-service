import { Response, Request } from "express";
import { inject, injectable } from "inversify";
import { GET } from "../framework/express/hotspring/hotSpring";
import { ModuleLoader } from "../core/modules/ModuleLoader";
import { getRecentAttempts, getStats } from "../core/auth/loginAttempts";
import { DB_POOL } from "../core/db/token";
import type { Pool } from "pg";

@injectable()
export default class HomeController {
  constructor(
    @inject(ModuleLoader) private readonly _moduleLoader: ModuleLoader,
    @inject(DB_POOL) private readonly _pool: Pool,
  ) {}

  @GET("/")
  public async renderHome(request: Request, response: Response): Promise<void> {
    // menuServices et currentUser sont déjà dans res.locals (middleware global,
    // voir ExpressApplication) : tout autre module en bénéficie sans rien faire.
    const [stats, attempts] = await Promise.all([
      getStats(this._pool),
      getRecentAttempts(this._pool),
    ]);

    response.render("pages/Home", {
      moduleCount: this._moduleLoader.getModuleCount(),
      categories: this._moduleLoader.getServicesByCategory(),
      stats,
      attempts,
    });
  }

  // Alimente la recherche du top-nav (SearchService.js) avec les modules
  // réellement installés — plus de liste statique à maintenir à la main.
  @GET("/api/suggestions")
  public async getSuggestions(request: Request, response: Response): Promise<void> {
    const suggestions = this._moduleLoader.getNavGroups().flatMap((group) =>
      group.items.map((item) => ({
        title: item.name,
        description: item.description,
        category: item.category,
        path: item.url,
      })),
    );
    response.json({ suggestions });
  }
}
