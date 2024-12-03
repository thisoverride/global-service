"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PUT = exports.POST = exports.GET = exports.HotSpring = void 0;
const HotSpring_1 = __importDefault(require("./core/HotSpring"));
exports.HotSpring = HotSpring_1.default;
const httpMethode_1 = require("./annotations/methods/httpMethode");
Object.defineProperty(exports, "GET", { enumerable: true, get: function () { return httpMethode_1.GET; } });
Object.defineProperty(exports, "POST", { enumerable: true, get: function () { return httpMethode_1.POST; } });
Object.defineProperty(exports, "PUT", { enumerable: true, get: function () { return httpMethode_1.PUT; } });
Object.defineProperty(exports, "DELETE", { enumerable: true, get: function () { return httpMethode_1.DELETE; } });
Object.defineProperty(exports, "OPTIONS", { enumerable: true, get: function () { return httpMethode_1.OPTIONS; } });
Object.defineProperty(exports, "HEAD", { enumerable: true, get: function () { return httpMethode_1.HEAD; } });
Object.defineProperty(exports, "PATCH", { enumerable: true, get: function () { return httpMethode_1.PATCH; } });
