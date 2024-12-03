import ExpressApplication from "./framework/express/ExpressApplication";

class Main {
    public static start() {
      const expressApp = new ExpressApplication();
      const port: number = parseInt(process.env.PORT as string, 10) || 3000;
      expressApp.run(port);
    }
}
Main.start();
