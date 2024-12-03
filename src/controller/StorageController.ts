import { Response, Request } from 'express';
import StorageService from '../service/StorageService';
import { inject, injectable } from 'inversify';
import { GET } from '../framework/express/hotspring/hotSpring';
import { LanguageManager } from '../utils/LanguageManager';
import { Translation } from '../@type/global';

@injectable()
export default class StorageController {
  private readonly TRANSLATION: Translation = LanguageManager.getTranslations();
  private readonly LOCAL: string = LanguageManager.getCurrentLanguage();
  private _storageService: StorageService;

  public constructor(
    @inject(StorageService) storageService: StorageService) {
    this._storageService = storageService;
  }

  @GET('/myluminous-library/:id')
  public async getGallery(request: Request, response: Response): Promise<void> {
    try {
      const { id } = request.params;
      const success = true;

      const photos = [
        'https://images.unsplash.com/photo-1648090320060-d4c61f30fb18?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'https://images.unsplash.com/photo-1648090330632-4c9531c3ea60?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
      ];

      response.render('index', {
        local : this.LOCAL,
        ...this.TRANSLATION,
        userPhotos: photos,
        count: photos.length,
        success,
      });

    } catch (error) {
      response.render('index', {
        ...this.TRANSLATION,
        userPhotos: [],
        count: '',
        success: false,
      });
    }
  }
}
