import { injectable } from 'inversify';
import { promises as fs } from 'fs';
import * as path from 'path';
import { HttpResponse } from '../controller/interfaces/ControllerInterface';

interface MenuServiceResponse {
  success: boolean;
  message?: string;
  data?: any;
}

@injectable()
export default class HomeService {
  private readonly MENU_SERVICES_PATH: string = path.resolve(__dirname,'../core/menuservices/services.json');

  public async getMenuServices(): Promise<MenuServiceResponse> {
    try {
      const fileContent = await fs.readFile(this.MENU_SERVICES_PATH, 'utf-8');
      const parsedContent = JSON.parse(fileContent);

      console.log(parsedContent.services)

      return {
        success: true,
        data: parsedContent
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: unknown): HttpResponse {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Erreur dans HomeService:', errorMessage);

    if (error) {
      return {
        success: false,
        data: {
          success: false,
          message: errorMessage
        }
      };
    }

    return {
      success: false,
      data: {
        success: false,
        message: 'Une erreur interne est survenue'
      }
    };
  }
}