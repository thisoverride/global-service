"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
class HotSpring {
    static bind(app, ioContainer, ControllerClass) {
        const controllerInstance = ioContainer.get(ControllerClass);
        const routes = Reflect.getMetadata('routes', ControllerClass) || [];
        routes.forEach((route) => {
            const handler = route.handler.bind(controllerInstance);
            const middlewares = route.middlewares || [];
            const method = route.method;
            if (typeof app[method] === 'function') {
                app[method](route.path, ...middlewares, handler);
            }
            else {
                throw new Error(`The function ${method} is not a valid`);
            }
        });
    }
}
exports.default = HotSpring;
