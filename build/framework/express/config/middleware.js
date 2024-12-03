"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const configureMiddleware = (app) => {
    // Configuration des limites et du parsing
    // app.use(express.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
    // Logging avec Morgan
    app.use((0, morgan_1.default)('dev'));
    // Configuration CORS étendue
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN || 'http://localhost:8007',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        maxAge: 600, // 10 minutes
    }));
    // Configuration EJS
    app.set('view engine', 'ejs');
    app.set('views', path_1.default.join(process.cwd(), 'src', 'views'));
    // Configuration des fichiers statiques avec headers de cache
    app.use(express_1.default.static(path_1.default.join(process.cwd(), 'public'), {
    // maxAge: '1d', // Cache pendant 1 jour
    // etag: true,
    // lastModified: true,
    }));
    // Middleware pour headers de sécurité supplémentaires
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });
};
exports.configureMiddleware = configureMiddleware;
