"use strict";
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
const express_1 = __importDefault(require("express"));
const inversify_1 = require("inversify");
const HotSpring_1 = __importDefault(require("./hotspring/core/HotSpring"));
const middleware_1 = require("./config/middleware");
const errorHandling_1 = require("./config/errorHandling");
const StorageService_1 = __importDefault(require("../../service/StorageService"));
const StorageController_1 = __importDefault(require("../../controller/StorageController"));
class ExpressApplication {
    constructor() {
        this.app = (0, express_1.default)();
        this.IoCContainer = new inversify_1.Container();
        this._initializeIoCContainer();
        this._configureApp();
    }
    _initializeIoCContainer() {
        this.IoCContainer.bind(StorageService_1.default).toSelf();
        this.IoCContainer.bind(StorageController_1.default).toSelf();
    }
    _configureApp() {
        (0, middleware_1.configureMiddleware)(this.app);
        HotSpring_1.default.bind(this.app, this.IoCContainer, StorageController_1.default);
        (0, errorHandling_1.configureErrorHandling)(this.app);
    }
    run(port) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.app.listen(port, () => __awaiter(this, void 0, void 0, function* () {
                    console.info('\x1b[1m\x1b[36m%s\x1b[0m', `Luminous Service on http://localhost:${port}`);
                }));
            }
            catch (error) {
                throw new Error(`Connection to database failed: ${String(error)}`);
            }
        });
    }
}
exports.default = ExpressApplication;
