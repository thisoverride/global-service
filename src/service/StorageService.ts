import { injectable } from 'inversify';
import * as fs from 'fs';
import * as path from 'path';
import HttpStatusCodes from '../utils/HttpStatusCode';
import StorageException from '../core/exception/StorageException';
import { HttpResponse } from '../controller/interfaces/ControllerInterface';

@injectable()
export default class StorageService {
    private readonly basePath: string = path.join(__dirname, '..', '..', 'public', 'assets', 'ressources');

    public async getPhotosById(id: string): Promise<HttpResponse> {
        try {
            if (!id || typeof id !== 'string') {
                throw new StorageException('ID invalide', HttpStatusCodes.BAD_REQUEST);
            }

            const folderPath = this.buildFolderPath(id);
            if (!fs.existsSync(folderPath)) {
                throw new StorageException('INVALID_DIR', HttpStatusCodes.NOT_FOUND);
            }

            if (!fs.statSync(folderPath).isDirectory()) {
                throw new StorageException('Le chemin spécifié n\'est pas un dossier', HttpStatusCodes.BAD_REQUEST);
            }

            const photos = this.listValidImages(folderPath);

            if (photos.length === 0) {
                throw new StorageException('Aucune image trouvée dans le dossier', HttpStatusCodes.NOT_FOUND);
            }

            return {
                data: {
                    message: photos,
                    success: true
                },
                success: true
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }


    private buildFolderPath(id: string): string {
        return path.join(this.basePath, id);
    }


    private listValidImages(folderPath: string): string[] {
        const files = fs.readdirSync(folderPath);
        return files
            .filter(file => this.isValidImageFile(file, path.join(folderPath, file)))
            .map(file => this.toRelativePath(path.join(folderPath, file)));
    }

    private isValidImageFile(filename: string, filepath: string): boolean {
        const validExtensions = /\.(png|jpg|jpeg|gif)$/i;
        return validExtensions.test(filename) && fs.statSync(filepath).isFile();
    }

    private toRelativePath(absolutePath: string): string {
        return '/' + path.relative(path.join(__dirname, '..', '..', 'public'), absolutePath);
    }

    private handleError(error: any): HttpResponse {
        console.error('Erreur dans StorageService:', error.message || error);
        return {
            data: {
                message: error.message || 'Erreur inconnue',
                success: false
            },
            success: false
        };
    }
}
