import type { Application } from 'express';
import { LanguageManager } from '../../../utils/LanguageManager';

export const configureErrorHandling = (app: Application): void => {
    const lang: string = LanguageManager.getCurrentLanguage();
    const translation = LanguageManager.getTranslations();

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
