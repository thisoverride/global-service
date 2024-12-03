import cors from 'cors';
import morgan from 'morgan';
import express, { Application } from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';

export const configureMiddleware = (app: Application): void => {
  // Configuration des limites et du parsing
  // app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Logging avec Morgan
  app.use(morgan('dev'));

  // Configuration CORS étendue
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:8007',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      maxAge: 600, // 10 minutes
    })
  );

  // Configuration EJS
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'src', 'views'));
  app.use(expressLayouts as unknown as express.RequestHandler);
  app.set('layout', 'layouts/main');

  // Configuration des fichiers statiques avec headers de cache
  app.use(
    express.static(path.join(process.cwd(), 'public'), {
      // maxAge: '1d', // Cache pendant 1 jour
      // etag: true,
      // lastModified: true,
    })
  );

  // Middleware pour headers de sécurité supplémentaires
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};