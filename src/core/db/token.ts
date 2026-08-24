// Symbole d'injection Inversify pour le pool pg partagé (Pool n'est pas
// construit par le conteneur, donc pas de binding par classe possible).
export const DB_POOL = Symbol.for('DB_POOL');
