"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("inversify");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const HttpStatusCode_1 = __importDefault(require("../utils/HttpStatusCode"));
const StorageException_1 = __importDefault(require("../core/exception/StorageException"));
let StorageService = class StorageService {
    constructor() {
        this.basePath = path.join(__dirname, '..', '..', 'public', 'assets', 'ressources');
    }
    getPhotosById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!id || typeof id !== 'string') {
                    throw new StorageException_1.default('ID invalide', HttpStatusCode_1.default.BAD_REQUEST);
                }
                const folderPath = this.buildFolderPath(id);
                if (!fs.existsSync(folderPath)) {
                    throw new StorageException_1.default('INVALID_DIR', HttpStatusCode_1.default.NOT_FOUND);
                }
                if (!fs.statSync(folderPath).isDirectory()) {
                    throw new StorageException_1.default('Le chemin spécifié n\'est pas un dossier', HttpStatusCode_1.default.BAD_REQUEST);
                }
                const photos = this.listValidImages(folderPath);
                if (photos.length === 0) {
                    throw new StorageException_1.default('Aucune image trouvée dans le dossier', HttpStatusCode_1.default.NOT_FOUND);
                }
                return {
                    data: {
                        message: photos,
                        success: true
                    },
                    success: true
                };
            }
            catch (error) {
                return this.handleError(error);
            }
        });
    }
    buildFolderPath(id) {
        return path.join(this.basePath, id);
    }
    listValidImages(folderPath) {
        const files = fs.readdirSync(folderPath);
        return files
            .filter(file => this.isValidImageFile(file, path.join(folderPath, file)))
            .map(file => this.toRelativePath(path.join(folderPath, file)));
    }
    isValidImageFile(filename, filepath) {
        const validExtensions = /\.(png|jpg|jpeg|gif)$/i;
        return validExtensions.test(filename) && fs.statSync(filepath).isFile();
    }
    toRelativePath(absolutePath) {
        return '/' + path.relative(path.join(__dirname, '..', '..', 'public'), absolutePath);
    }
    handleError(error) {
        console.error('Erreur dans StorageService:', error.message || error);
        return {
            data: {
                message: error.message || 'Erreur inconnue',
                success: false
            },
            success: false
        };
    }
};
StorageService = __decorate([
    (0, inversify_1.injectable)()
], StorageService);
exports.default = StorageService;
