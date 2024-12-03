"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureErrorHandling = void 0;
const LanguageManager_1 = require("../../../utils/LanguageManager");
const configureErrorHandling = (app) => {
    const lang = LanguageManager_1.LanguageManager.getCurrentLanguage();
    const translation = LanguageManager_1.LanguageManager.getTranslations();
    app.use((req, res, next) => {
        const err = new Error('Not Found');
        res.status(404);
        if (req.accepts('html')) {
            res.render('errors/404', {
                t: translation,
                local: lang,
                url: req.url,
                error: err
            });
            return;
        }
    });
};
exports.configureErrorHandling = configureErrorHandling;
