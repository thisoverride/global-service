"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
const StorageService_1 = __importDefault(require("../service/StorageService"));
const inversify_1 = require("inversify");
const hotSpring_1 = require("../framework/express/hotspring/hotSpring");
const LanguageManager_1 = require("../utils/LanguageManager");
let StorageController = class StorageController {
    constructor(storageService) {
        this.TRANSLATION = LanguageManager_1.LanguageManager.getTranslations();
        this.LOCAL = LanguageManager_1.LanguageManager.getCurrentLanguage();
        this._storageService = storageService;
    }
    getGallery(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const success = true;
                const photos = [
                    'https://images.unsplash.com/photo-1648090320060-d4c61f30fb18?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                    'https://images.unsplash.com/photo-1648090330632-4c9531c3ea60?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
                ];
                response.render('index', Object.assign(Object.assign({ local: this.LOCAL }, this.TRANSLATION), { userPhotos: photos, count: photos.length, success }));
            }
            catch (error) {
                response.render('index', Object.assign(Object.assign({}, this.TRANSLATION), { userPhotos: [], count: '', success: false }));
            }
        });
    }
};
__decorate([
    (0, hotSpring_1.GET)('/myluminous-library/:id'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getGallery", null);
StorageController = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(StorageService_1.default)),
    __metadata("design:paramtypes", [StorageService_1.default])
], StorageController);
exports.default = StorageController;
