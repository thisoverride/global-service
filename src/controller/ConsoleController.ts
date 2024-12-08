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
    cloudview: string
  }
  script: any
}

@injectable()
export default class ConsoleController {
  private readonly STATIC_PATHS: StaticPaths = {
    menuServices: path.resolve(__dirname, '../core/data/menuServices'),
    translations: path.resolve(__dirname, '../core/data/translations'),
    styles: {
      home: '/assets/css/home/hc-style.css',
      wpauto: '/assets/css/wpauto/wpauto-style.css',
      vmx: '/assets/css/vmx/vmx-style.css',
      cloudview: '/assets/css/cloudview/cvw_style.css',
    },
    script : {
      cloudforge : '/assets/js/view/Test.js'
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
      await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices + '/services.json', {
        duration: 1 * 60 * 1000,
        autoRefresh: true
      });

      // Charge les traductions
      const currentLang = 'fr'; // À remplacer par votre logique de langue
      // await this._staticDataManager.loadData(
      //   path.join(this.STATIC_PATHS.translations, `${currentLang}.json`)
      // );
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des données statiques:', error);
    }
  }

  private getStyleLink(stylePath: string): string {
    return `<link rel="stylesheet" href="${stylePath}">`;
  }
  private getScriptLink(scriptPath: string): string {
    return `<script type="module" src="${scriptPath}"></script>`;
}


  @GET("/")
  public async renderHome(request: Request, response: Response): Promise<void> {
    try {
      const menuServices = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices + '/services.json');

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
  public async renderXrush(request: Request, response: Response): Promise<void> {
    try {
      const menuServices = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices + '/services.json');

      response.render("pages/Xrush", {
        styles: this.getStyleLink(this.STATIC_PATHS.styles.wpauto),
        script : this.getScriptLink(this.STATIC_PATHS.script.cloudforge),
        menuServices,
        title : 'X-Rush',
        success: true
      });
    } catch (error) {
      response.render("index");
    }
  }

  @GET("/cloudforge")
  public async renderCloudForge(request: Request, response: Response): Promise<void> {
    try {
      const menuServices = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices + '/services.json');

      response.render("pages/Cloudforge/Main", {
        styles: this.getStyleLink(this.STATIC_PATHS.styles.vmx),
        script : this.getScriptLink(this.STATIC_PATHS.script.cloudforge),
        menuServices,
        title : 'CloudForge',
        success: true
      });
    } catch (error) {
      response.render("index");
    }
  }

  @GET("/cloudview")
  public async renderCloudView(request: Request, response: Response): Promise<void> {
    try {
      const menuServices = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices + '/services.json');

      response.render("pages/CloudView/Main", {
        styles: this.getStyleLink(this.STATIC_PATHS.styles.cloudview),
        // script : this.getScriptLink(this.STATIC_PATHS.script.cloudforge),
        menuServices,
        title : 'CloudView',
        success: true
      });
    } catch (error) {
      response.render("index");
    }
  }

  @GET("/api/suggestions")
  public async getSuggestions(request: Request, response: Response): Promise<void> {
  try {
    const suggestions = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices + '/parrot.json');
    response.json(suggestions);
  } catch (error) {
    response.status(500).json({ 
      error: error instanceof Error ? error.message : 'Error fetching suggestions' 
    });
  }
}
}