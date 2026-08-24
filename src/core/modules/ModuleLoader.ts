import { promises as fs } from 'fs';
import * as path from 'path';
import { Application, RequestHandler } from 'express';
import { Pool } from 'pg';
import { runModuleMigrations } from '../db/migrate';
import { ConsoleModule, ModuleFactory } from './types';

export interface NavGroup {
  letter: string;
  items: NavItem[];
}

export interface NavItem {
  id: string;
  name: string;
  icon: string;
  url: string;
  description: string;
  category: string;
}

// Decouvre, charge et monte chaque module sous src/modules/<id>/. Un module
// n'a besoin de rien connaitre du coeur au-dela du contrat ConsoleModule :
// ajouter un service = ajouter un dossier ici, aucune autre modification.
export class ModuleLoader {
  private readonly modulesDir = path.join(__dirname, '..', '..', 'modules');
  private loaded: ConsoleModule[] = [];

  public async loadAll(app: Application, pool: Pool, requireAuth: RequestHandler): Promise<void> {
    let entries: string[];
    try {
      entries = await fs.readdir(this.modulesDir);
    } catch {
      console.warn(`Aucun dossier de modules trouvé (${this.modulesDir})`);
      return;
    }

    for (const entry of entries.sort()) {
      const dir = path.join(this.modulesDir, entry);
      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) continue;

      try {
        await this.loadOne(dir, app, pool, requireAuth);
      } catch (error) {
        console.error(`❌ Module "${entry}" non chargé :`, error instanceof Error ? error.message : error);
      }
    }
  }

  private async loadOne(dir: string, app: Application, pool: Pool, requireAuth: RequestHandler): Promise<void> {
    const entryPoint = path.join(dir, 'index');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require(entryPoint);
    const factory: ModuleFactory = imported.default ?? imported;
    const consoleModule = await factory(pool);

    if (consoleModule.migrationsDir) {
      await runModuleMigrations(pool, consoleModule.manifest.id, consoleModule.migrationsDir);
    }

    // Un module peut avoir ses propres vues EJS (convention : prefixees par
    // son id, ex. cloudflare-index.ejs, pour eviter toute collision entre
    // modules qui partagent le meme moteur de rendu que le coeur).
    const viewsDir = path.join(dir, 'views');
    try {
      await fs.stat(viewsDir);
      const currentViews = app.get('views') as string | string[];
      app.set('views', Array.isArray(currentViews) ? [...currentViews, viewsDir] : [currentViews, viewsDir]);
    } catch {
      // pas de vues, module purement API (ex: routes JSON)
    }

    app.use(consoleModule.manifest.basePath, requireAuth, consoleModule.router);
    this.loaded.push(consoleModule);
    console.info(`🧩 Module chargé : ${consoleModule.manifest.name} (${consoleModule.manifest.basePath})`);
  }

  // Regroupe les modules par lettre initiale, meme forme que l'ancien
  // services.json statique — le panneau nav.ejs n'a rien a changer.
  public getNavGroups(): NavGroup[] {
    const byLetter = new Map<string, NavItem[]>();

    for (const m of this.loaded) {
      const letter = m.manifest.name.charAt(0).toUpperCase();
      const item: NavItem = {
        id: m.manifest.id,
        name: m.manifest.name,
        icon: m.manifest.icon,
        url: m.manifest.basePath,
        description: m.manifest.description,
        category: m.manifest.category,
      };
      if (!byLetter.has(letter)) byLetter.set(letter, []);
      byLetter.get(letter)!.push(item);
    }

    return [...byLetter.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, items]) => ({ letter, items }));
  }

  public getModuleCount(): number {
    return this.loaded.length;
  }
}
