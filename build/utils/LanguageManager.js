"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class LanguageManager {
    static getCurrentLanguage() {
        try {
            if (!fs_1.default.existsSync(this.configPath)) {
                console.warn(`Fichier de configuration non trouvé: ${this.configPath}`);
                return 'fr';
            }
            const configContent = fs_1.default.readFileSync(this.configPath, 'utf8');
            if (!configContent) {
                throw new Error('EMPTY_LANG_FILE');
            }
            const config = JSON.parse(configContent);
            if (!config.currentLanguage) {
                console.warn('Langue non définie dans la configuration');
                return 'fr';
            }
            return config.currentLanguage;
        }
        catch (error) {
            console.error('Erreur lors de la lecture de la configuration de langue:', error);
            return 'fr';
        }
    }
    static getTranslations() {
        try {
            const currentLang = this.getCurrentLanguage();
            const translationPath = path_1.default.join(this.localesPath, `${currentLang}.json`);
            if (!fs_1.default.existsSync(translationPath)) {
                console.warn(`Fichier de traduction non trouvé: ${translationPath}`);
                const fallbackPath = path_1.default.join(this.localesPath, 'fr.json');
                if (!fs_1.default.existsSync(fallbackPath)) {
                    throw new Error('NO_TRANSLATION_FILES_FOUND');
                }
                return JSON.parse(fs_1.default.readFileSync(fallbackPath, 'utf8'));
            }
            const translationContent = fs_1.default.readFileSync(translationPath, 'utf8');
            if (!translationContent) {
                throw new Error('EMPTY_TRANSLATION_FILE');
            }
            return JSON.parse(translationContent);
        }
        catch (error) {
            console.error('Erreur lors de la lecture des traductions:', error);
            throw error;
        }
    }
    static setLanguage(language) {
        try {
            if (!this.isValidLanguage(language)) {
                throw new Error('INVALID_LANGUAGE');
            }
            const config = { currentLanguage: language };
            const dir = path_1.default.dirname(this.configPath);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
        }
        catch (error) {
            console.error('Erreur lors de l\'écriture de la configuration de langue:', error);
            throw error;
        }
    }
    static isValidLanguage(lang) {
        try {
            // Vérifie si le fichier de traduction existe pour cette langue
            return fs_1.default.existsSync(path_1.default.join(this.localesPath, `${lang}.json`));
        }
        catch (error) {
            console.error('Erreur lors de la vérification de la langue:', error);
            return false;
        }
    }
}
exports.LanguageManager = LanguageManager;
LanguageManager.configPath = path_1.default.join(process.cwd(), 'src', 'core', 'lang', 'config', 'language.json');
LanguageManager.localesPath = path_1.default.join(process.cwd(), 'src', 'core', 'lang', 'locales');
