import { Request, Response, NextFunction } from 'express';

// Protege tout ce qui n'est pas explicitement public (login, assets). Monte
// par ModuleLoader devant chaque route d'administration, puis sur les pages
// privées du coeur. Les API d'appareils ont des identifiants limités distincts.
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
