"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPTIONS = exports.HEAD = exports.PATCH = exports.DELETE = exports.PUT = exports.GET = exports.POST = void 0;
require("reflect-metadata");
function createMethodDecorator(method) {
    return (path, ...middlewares) => {
        return (target, propertyKey, descriptor) => {
            const existingRoutes = Reflect.getMetadata('routes', target.constructor) || [];
            existingRoutes.push({
                method,
                path,
                handler: target[propertyKey],
                middlewares: [...middlewares, ...(Reflect.getMetadata('middlewares', target, propertyKey) || [])] // Ajoute les middlewares supplémentaires
            });
            Reflect.defineMetadata('routes', existingRoutes, target.constructor);
        };
    };
}
// function createMethodDecorator(method: string) {
//   return (path: string): MethodDecorator => {
//     return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
//       const existingRoutes = Reflect.getMetadata('routes', target.constructor) || [];
//       existingRoutes.push({
//         method,
//         path,
//         handler: target[propertyKey] as RequestHandler,
//         middlewares: Reflect.getMetadata('middlewares', target, propertyKey) || []
//       });
//       Reflect.defineMetadata('routes', existingRoutes, target.constructor);
//     };
//   };
// }
exports.POST = createMethodDecorator('post');
exports.GET = createMethodDecorator('get');
exports.PUT = createMethodDecorator('put');
exports.DELETE = createMethodDecorator('delete');
exports.PATCH = createMethodDecorator('patch');
exports.HEAD = createMethodDecorator('head');
exports.OPTIONS = createMethodDecorator('options');
