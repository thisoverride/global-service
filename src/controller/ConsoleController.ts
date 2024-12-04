import { Response, Request } from "express";
import StorageService from "../service/StorageService";
import { inject, injectable } from "inversify";
import { GET } from "../framework/express/hotspring/hotSpring";
import { LanguageManager } from "../utils/LanguageManager";
import { Translation } from "../@type/global";

@injectable()
export default class ConsoleController {
  private readonly TRANSLATION: Translation = LanguageManager.getTranslations();
  private readonly LOCAL: string = LanguageManager.getCurrentLanguage();
  private _storageService: StorageService;

  public constructor(@inject(StorageService) storageService: StorageService) {
    this._storageService = storageService;
  }

  @GET("/")
  public async renderIndex(request: Request,response: Response): Promise<void> {
    try {
      response.render("pages/home", {
        styles: '<link rel="stylesheet" href="/assets/css/home/hc-style.css">',
      });
    } catch (error) {
      response.render("index");
    }
  }

  @GET("/wpautomator")
  public async renderAutomator(request: Request, response: Response): Promise<void> {
    try {
      response.render("pages/WpAutomator", {
        styles:
          '<link rel="stylesheet" href="/assets/css/wpauto/wpauto-style.css">',
      });
    } catch (error) {
      response.render("index");
    }
  }

  @GET("/cloudforge")
  public async renderVmx(request: Request, response: Response): Promise<void> {
    try {
      response.render("pages/Xrush", {
        styles:
          '<link rel="stylesheet" href="/assets/css/vmx/vmx-style.css">',
      });
    } catch (error) {
      response.render("index");
    }
  }
}
