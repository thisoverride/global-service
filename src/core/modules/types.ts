import { Router } from 'express';
import { Pool } from 'pg';

export interface ModuleManifest {
  id: string;            // identifiant stable, utilise pour les migrations/reglages ('cloudflare')
  name: string;           // nom affiche ('Cloudflare')
  description: string;
  icon: string;            // SVG inline (meme format que l'ancien services.json)
  category: string;        // groupe d'affichage dans le panneau de services
  basePath: string;        // prefixe de route, ex: '/modules/cloudflare'
}

// Contrat minimal qu'un module doit remplir. Tout le reste (comment le
// router est construit, quelles vues il utilise, quelles librairies il
// importe) n'appartient qu'au module — le coeur ne regarde jamais dedans.
export interface ConsoleModule {
  manifest: ModuleManifest;
  router: Router;
  migrationsDir?: string;
}

// Signature attendue de l'export par defaut de chaque src/modules/<id>/index.ts.
// Le pool est injecte par le chargeur : un module n'ouvre jamais sa propre
// connexion, il reutilise celle du coeur. Asynchrone pour les modules qui ont
// besoin de verifier/preparer une ressource externe avant de servir (ex: QEMU
// qui s'assure que son pool de stockage libvirt existe).
export type ModuleFactory = (pool: Pool) => ConsoleModule | Promise<ConsoleModule>;
