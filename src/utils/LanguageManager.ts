import fs from 'fs';
import path from 'path';
import { LanguageConfig, Translation } from '../@type/global';

export class LanguageManager {
  private static configPath: string = path.join(process.cwd(), 'src', 'core', 'lang', 'config', 'language.json');
  private static localesPath: string = path.join(process.cwd(), 'src', 'core', 'lang', 'locales');

  public static getCurrentLanguage(): string {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.warn(`Fichier de configuration non trouvé: ${this.configPath}`);
        return 'fr';
      }

      const configContent = fs.readFileSync(this.configPath, 'utf8');
      if(!configContent) {
        throw new Error('EMPTY_LANG_FILE');
      }

      const config: LanguageConfig = JSON.parse(configContent);
      
      if (!config.currentLanguage) {
        console.warn('Langue non définie dans la configuration');
        return 'fr';
      }

      return config.currentLanguage;
    } catch (error) {
      console.error('Erreur lors de la lecture de la configuration de langue:', error);
      return 'fr';
    }
  }

  public static getTranslations(): Translation {
    try {
      const currentLang = this.getCurrentLanguage();
      const translationPath = path.join(this.localesPath, `${currentLang}.json`);

      if (!fs.existsSync(translationPath)) {
        console.warn(`Fichier de traduction non trouvé: ${translationPath}`);
        const fallbackPath = path.join(this.localesPath, 'fr.json');
        if (!fs.existsSync(fallbackPath)) {
          throw new Error('NO_TRANSLATION_FILES_FOUND');
        }
        return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      }

      const translationContent = fs.readFileSync(translationPath, 'utf8');
      if (!translationContent) {
        throw new Error('EMPTY_TRANSLATION_FILE');
      }

      return JSON.parse(translationContent);
    } catch (error) {
      console.error('Erreur lors de la lecture des traductions:', error);
      throw error;
    }
  }

  public static setLanguage(language: string): void {
    try {
      if (!this.isValidLanguage(language)) {
        throw new Error('INVALID_LANGUAGE');
      }

      const config: LanguageConfig = { currentLanguage: language };
      const dir = path.dirname(this.configPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Erreur lors de l\'écriture de la configuration de langue:', error);
      throw error;
    }
  }

  public static isValidLanguage(lang: string): boolean {
    try {
      // Vérifie si le fichier de traduction existe pour cette langue
      return fs.existsSync(path.join(this.localesPath, `${lang}.json`));
    } catch (error) {
      console.error('Erreur lors de la vérification de la langue:', error);
      return false;
    }
  }
}