import { Response, Request } from "express";
import { inject, injectable } from "inversify";
import { GET } from "../framework/express/hotspring/hotSpring";
import { Translation } from "../@type/global";
import HomeService from "../services/HomeService";
import { StaticDataManager } from "../core/managers/StaticDataManager";
import * as path from 'path';

interface StaticPaths {
  menuServices: string;
  translations: string;
  styles: {
    home: string;
    wpauto: string;
    vmx: string;
  };
}

@injectable()
export default class ConsoleController {
  private readonly STATIC_PATHS: StaticPaths = {
    menuServices: path.resolve(__dirname, '../core/data/menuServices/services.json'),
    translations: path.resolve(__dirname, '../core/data/translations'),
    styles: {
      home: '/assets/css/home/hc-style.css',
      wpauto: '/assets/css/wpauto/wpauto-style.css',
      vmx: '/assets/css/vmx/vmx-style.css'
    }
  };

  constructor(
    @inject(HomeService) private readonly _homeService: HomeService,
    @inject(StaticDataManager) private readonly _staticDataManager: StaticDataManager
  ) {
    this.initializeStaticData();
  }

  private async initializeStaticData(): Promise<void> {
    try {
      // Charge les services avec auto-refresh toutes les 5 minutes
      await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices, {
        duration: 1 * 60 * 1000,
        autoRefresh: true
      });

      // Charge les traductions
      const currentLang = 'fr'; // À remplacer par votre logique de langue
      await this._staticDataManager.loadData(
        path.join(this.STATIC_PATHS.translations, `${currentLang}.json`)
      );
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des données statiques:', error);
    }
  }

  private getStyleLink(stylePath: string): string {
    return `<link rel="stylesheet" href="${stylePath}">`;
  }

  @GET("/")
  public async renderHome(request: Request, response: Response): Promise<void> {
    try {
      const menuServices = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices);

      response.render("pages/home", {
        styles: this.getStyleLink(this.STATIC_PATHS.styles.home),
        menuServices,
        success: true
      });
    } catch (error) {
      console.error('Erreur dans HomeController:', error);
      
      response.render("pages/home", {
        styles: this.getStyleLink(this.STATIC_PATHS.styles.home),
        menuServices: [],
        success: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    }
  }

  @GET("/xrush")
  public async renderAutomator(request: Request, response: Response): Promise<void> {
    try {
      const menuServices = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices);

      response.render("pages/Xrush", {
        styles: this.getStyleLink(this.STATIC_PATHS.styles.wpauto),
        menuServices,
        success: true
      });
    } catch (error) {
      response.render("index");
    }
  }

  @GET("/cloudforge")
  public async renderVmx(request: Request, response: Response): Promise<void> {
    try {
      const menuServices = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices);

      response.render("pages/Xrush", {
        styles: this.getStyleLink(this.STATIC_PATHS.styles.vmx),
        menuServices,
        success: true
      });
    } catch (error) {
      response.render("index");
    }
  }
}