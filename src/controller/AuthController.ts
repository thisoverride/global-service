import { Response, Request } from "express";
import StorageService from "../service/StorageService";
import { inject, injectable } from "inversify";
import { GET } from "../framework/express/hotspring/hotSpring";


@injectable()
export default class AuthController {
  private _storageService: StorageService;

  public constructor(@inject(StorageService) storageService: StorageService) {
    this._storageService = storageService;
  }

  @GET("/login")
  public async renderIndex(request: Request,response: Response): Promise<void> {
    try {
      response.render('pages/login',{
         layout: false,
         title: 'SxCloudX',
      });
    } catch (error) {
      response.render("index");
    }
  }

}
