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
    menuServices: path.resolve(__dirname, '../core/data/menuServices'),
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



  @GET("/api/suggestions")
  public async getSuggestions(request: Request, response: Response): Promise<void> {
  try {
    const suggestions = await this._staticDataManager.loadData(this.STATIC_PATHS.menuServices + '/parrot.json');
    console.log(suggestions)
    response.json(suggestions);
  } catch (error) {
    response.status(500).json({ 
      error: error instanceof Error ? error.message : 'Error fetching suggestions' 
    });
  }
}
}