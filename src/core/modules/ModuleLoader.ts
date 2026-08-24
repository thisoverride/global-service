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

export interface CategoryGroup {
  category: string;
  items: NavItem[];
}

export interface SidebarLink {
  label: string;
  url: string;
}

export interface SidebarEntry {
  id: string;
  name: string;
  icon: string;
  url: string;
  links: SidebarLink[];
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

  private getAllItems(): NavItem[] {
    return this.loaded.map((m) => ({
      id: m.manifest.id,
      name: m.manifest.name,
      icon: m.manifest.icon,
      url: m.manifest.basePath,
      description: m.manifest.description,
      category: m.manifest.category,
    }));
  }

  // Regroupe les modules par lettre initiale, meme forme que l'ancien
  // services.json statique — le panneau nav.ejs n'a rien a changer.
  public getNavGroups(): NavGroup[] {
    const byLetter = new Map<string, NavItem[]>();
    for (const item of this.getAllItems()) {
      const letter = item.name.charAt(0).toUpperCase();
      if (!byLetter.has(letter)) byLetter.set(letter, []);
      byLetter.get(letter)!.push(item);
    }

    return [...byLetter.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, items]) => ({ letter, items }));
  }

  // Regroupe par categorie — pour la grille de la page d'accueil, plus
  // parlante qu'un classement alphabetique quand il y a peu de modules.
  public getServicesByCategory(): CategoryGroup[] {
    const byCategory = new Map<string, NavItem[]>();
    for (const item of this.getAllItems()) {
      if (!byCategory.has(item.category)) byCategory.set(item.category, []);
      byCategory.get(item.category)!.push(item);
    }

    return [...byCategory.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({ category, items }));
  }

  // Le module dont on consulte une page, d'apres l'URL courante — la barre
  // laterale n'affiche que ses sections, jamais celles des autres (la
  // navigation entre modules passe par le panneau "Services" du haut).
  // Renvoie null sur les pages du coeur, ou le module n'a pas lieu d'etre.
  public getActiveModule(path: string): SidebarEntry | null {
    const found = this.loaded.find(
      (m) => path === m.manifest.basePath || path.startsWith(m.manifest.basePath + "/"),
    );
    if (!found) return null;

    const { id, name, icon, basePath, links } = found.manifest;
    return {
      id,
      name,
      icon,
      url: basePath,
      links: (links ?? []).map((l) => ({
        label: l.label,
        url: l.path ? `${basePath}/${l.path}`.replace(/\/+/g, "/") : basePath,
      })),
    };
  }

  public getModuleCount(): number {
    return this.loaded.length;
  }
}
