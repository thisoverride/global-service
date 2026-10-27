import { Request, Response, NextFunction, RequestHandler } from 'express';

export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { Promise.resolve(handler(req, res)).catch(next); };

export const sameOrigin: RequestHandler = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== `${req.protocol}://${req.get('host')}`) {
    res.status(403).json({ error: 'Origine non autorisée.' });
    return;
  }
  next();
};

export function moduleError(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const known = error instanceof InputError;
  res.status(known ? error.status : 503).json({
    error: known ? error.message : 'Service indisponible. Vérifiez la connexion et réessayez.',
  });
}
