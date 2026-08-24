import type { Application, NextFunction, Request, Response } from 'express';

export const configureErrorHandling = (app: Application): void => {
  app.use((req: Request, res: Response) => {
    res.status(404);
    if (req.accepts('html')) {
      res.render('pages/404', { layout: false, url: req.url });
      return;
    }
    res.json({ success: false, error: 'Not Found' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500);
    if (req.accepts('html')) {
      res.render('pages/500', { layout: false, message: err.message });
      return;
    }
    res.json({ success: false, error: 'Erreur interne' });
  });
};
