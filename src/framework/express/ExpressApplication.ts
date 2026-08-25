import express, { Application } from 'express';
import { Container } from 'inversify';
import HotSpring from './hotspring/core/HotSpring';
import { configureMiddleware } from './config/middleware';
import { configureErrorHandling } from './config/errorHandling';

import AuthController from '../../controller/AuthController';
import HomeController from '../../controller/HomeController';
import { pool } from '../../core/db/pool';
import { DB_POOL } from '../../core/db/token';
import { bootstrapMigrationTracking, runModuleMigrations } from '../../core/db/migrate';
import { bootstrapAdminUser } from '../../core/auth/users';
import { createSessionMiddleware } from '../../core/auth/session';
import { requireAuth } from '../../core/auth/requireAuth';
import { ModuleLoader } from '../../core/modules/ModuleLoader';
import * as path from 'path';
import { assetUrl } from '../../core/assets';

export default class ExpressApplication {
  private app: Application;
  private IoCContainer: Container;
  private moduleLoader: ModuleLoader;

  constructor() {
    this.app = express();
    this.IoCContainer = new Container();
    this.moduleLoader = new ModuleLoader();
    this._initializeIoCContainer();
  }

  private _initializeIoCContainer(): void {
    this.IoCContainer.bind(DB_POOL).toConstantValue(pool);
    this.IoCContainer.bind<ModuleLoader>(ModuleLoader).toConstantValue(this.moduleLoader);
    this.IoCContainer.bind<AuthController>(AuthController).toSelf().inRequestScope();
    this.IoCContainer.bind<HomeController>(HomeController).toSelf().inRequestScope();
  }

  // Prepare tout ce qui doit exister avant d'accepter des requetes : base
  // (migrations coeur + compte admin) puis modules (chacun avec ses propres
  // migrations) — dans cet ordre, sinon un module ne trouverait pas encore
  // schema_migrations.
  private async _bootstrapDatabase(): Promise<void> {
    await bootstrapMigrationTracking(pool);
    await runModuleMigrations(pool, 'core', path.join(__dirname, '..', '..', 'core', 'db', 'migrations'));
    await bootstrapAdminUser(pool);
  }

  private _configureApp(): void {
    configureMiddleware(this.app);
    this.app.use(createSessionMiddleware(pool));

    // Disponible sur toutes les vues (y compris celles des modules) sans
    // qu'aucun module n'ait besoin d'y penser.
    this.app.use((req, res, next) => {
      res.locals.menuServices = { services: this.moduleLoader.getNavGroups() };
      res.locals.activeModule = this.moduleLoader.getActiveModule(req.path);
      // Sert a marquer l'entree active dans la barre laterale.
      res.locals.currentPath = req.path;
      res.locals.currentUser = req.session.username;
      // Formatage des dates expose a toutes les vues : la copie de cette
      // fonction dans chaque template etait la porte ouverte a des formats
      // divergents d'une page a l'autre.
      // Empreinte de contenu sur les URL d'assets : voir core/assets.ts.
      res.locals.asset = assetUrl;
      res.locals.formatDateTime = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleString('fr-FR') : '—';
      next();
    });

    const publicControllers = [AuthController];
    publicControllers.forEach((ctlClass) => HotSpring.bind(this.app, this.IoCContainer, ctlClass));

    this.app.use(requireAuth);

    const privateControllers = [HomeController];
    privateControllers.forEach((ctlClass) => HotSpring.bind(this.app, this.IoCContainer, ctlClass));
  }

  public async run(port: number): Promise<void> {
    await this._bootstrapDatabase();
    this._configureApp();
    // Monte chaque module APRES les controleurs du coeur : requireAuth est deja
    // en place, donc tout module en herite automatiquement.
    await this.moduleLoader.loadAll(this.app, pool, requireAuth);
    configureErrorHandling(this.app);

    this.app.listen(port, () => {
      // Trace le fuseau resolu : c'est lui qui date tout ce que la console
      // affiche. Le voir au demarrage rend une regression de TZ evidente
      // dans les logs, au lieu de se manifester par des heures fausses.
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.info('\x1b[1m\x1b[36m%s\x1b[0m', `Console sur http://localhost:${port} (fuseau : ${zone})`);
    });
  }
}
