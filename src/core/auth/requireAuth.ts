import { Request, Response, NextFunction } from 'express';

// Protege tout ce qui n'est pas explicitement public (login, assets). Monte
// sur l'app APRES les routes publiques et AVANT le chargeur de modules, donc
// tous les modules en heritent automatiquement sans rien faire de leur cote.
export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  if (request.session.userId) {
    next();
    return;
  }

  if (request.accepts('html')) {
    response.redirect(`/login?next=${encodeURIComponent(request.originalUrl)}`);
    return;
  }

  response.status(401).json({ success: false, error: 'Authentification requise' });
}
