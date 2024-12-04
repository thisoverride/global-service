import express, { Application } from 'express';
import { Container } from 'inversify';
import HotSpring from './hotspring/core/HotSpring';
import { configureMiddleware } from './config/middleware';
import { configureErrorHandling } from './config/errorHandling';

import ConsoleController from '../../controller/ConsoleController';
import AuthController from '../../controller/AuthController';
import HomeService from '../../services/HomeService';
import { StaticDataManager } from '../../core/managers/StaticDataManager';

export default class ExpressApplication {
  private app: Application;
  private IoCContainer: Container;

  constructor() {
    this.app = express();
    this.IoCContainer = new Container();
    this._initializeIoCContainer();
    this._configureApp();
  }

  private _initializeIoCContainer(): void {
    this.IoCContainer.bind<StaticDataManager>(StaticDataManager).toSelf().inSingletonScope();
    this.IoCContainer.bind<HomeService>(HomeService).toSelf().inSingletonScope();
    this.IoCContainer.bind<ConsoleController>(ConsoleController).toSelf().inRequestScope();
    this.IoCContainer.bind<AuthController>(AuthController).toSelf().inRequestScope();
  }

  private _configureApp(): void {
    configureMiddleware(this.app);
    const constroller = [AuthController, ConsoleController];
    constroller.forEach((ctlClass) => HotSpring.bind(this.app, this.IoCContainer, ctlClass))
    configureErrorHandling(this.app);
  }

  public async run(port: number): Promise<void> {
    try {
      this.app.listen(port, async () => {
        console.info('\x1b[1m\x1b[36m%s\x1b[0m', `Luminous Service on http://localhost:${port}`);
      });
    } catch (error) {
      throw new Error(`Connection to database failed: ${String(error)}`);
    }
  }
}
