"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const expressLayouts = __importStar(require("express-ejs-layouts"));
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
    app.use(expressLayouts);
    app.set('layout', 'layouts/main');
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
