import * as path from "path";

// Jamais base sur process.cwd(), qui dependrait du repertoire depuis lequel
// le processus est lance — toujours relatif a ce fichier (src/core en dev,
// build/core en prod), donc stable quel que soit le WORKDIR du conteneur.

// Racine des vues EJS : "src" en dev (ts-node-dev lit directement les .ejs),
// "build" en prod — le script `npm run build` y copie les .ejs (core et
// modules) puisque tsc ne compile que le .ts.
export const VIEWS_ROOT = path.join(__dirname, "..");

// Racine du depot (contient public/, src/, build/, package.json) : un niveau
// au-dessus de VIEWS_ROOT dans les deux cas. public/ n'a pas besoin d'etre
// copie ailleurs, il est servi tel quel depuis sa position d'origine.
export const PROJECT_ROOT = path.join(__dirname, "..", "..");
