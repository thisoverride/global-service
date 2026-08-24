import helmet from 'helmet';
import morgan from 'morgan';
import express, { Application } from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import { PROJECT_ROOT, VIEWS_ROOT } from '../../../core/paths';

export const configureMiddleware = (app: Application): void => {
  // Derriere le reverse proxy Traefik : necessaire pour que les cookies de
  // session "secure" soient reconnus comme servis en HTTPS.
  app.set('trust proxy', 1);

  // CSP assouplie sur script/style : les vues EJS utilisent encore des
  // <script>/<style> en ligne, et FontAwesome est chargé depuis son CDN.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
          fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'data:'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(morgan('dev'));

  // Configuration EJS
  app.set('view engine', 'ejs');
  app.set('views', path.join(VIEWS_ROOT, 'views'));
  app.use(expressLayouts as unknown as express.RequestHandler);
  app.set('layout', 'layouts/main');

  app.use(express.static(path.join(PROJECT_ROOT, 'public')));
};
