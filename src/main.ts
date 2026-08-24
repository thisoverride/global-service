import 'reflect-metadata';
import ExpressApplication from "./framework/express/ExpressApplication";

class Main {
    public static start() {
      const expressApp = new ExpressApplication();
      const port: number = parseInt(process.env.PORT as string, 10) || 3000;
      expressApp.run(port).catch((error) => {
        console.error('❌ Démarrage impossible :', error instanceof Error ? error.message : error);
        process.exit(1);
      });
    }
}
Main.start();
