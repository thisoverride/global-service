"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ExpressApplication_1 = __importDefault(require("./framework/express/ExpressApplication"));
class Main {
    static start() {
        const expressApp = new ExpressApplication_1.default();
        const port = parseInt(process.env.PORT, 10) || 3000;
        expressApp.run(port);
    }
}
Main.start();
