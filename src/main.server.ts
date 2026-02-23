//import { bootstrapApplication } from '@angular/platform-browser';
//import { AppComponent } from './app/app.component';
//import { config } from './app/app.config.server';
//const bootstrap = () => bootstrapApplication(AppComponent, config);
//export default bootstrap;
import './polyfills.server';
import { AppServerModule } from './app/app.server.module';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';

if (environment.production) {
  enableProdMode();
}

export default AppServerModule;

