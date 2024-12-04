import { Response, Request } from "express";
import { inject, injectable } from "inversify";
import { GET } from "../framework/express/hotspring/hotSpring";


@injectable()
export default class AuthController {




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
