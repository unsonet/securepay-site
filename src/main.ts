// import { bootstrapApplication } from '@angular/platform-browser';
// import { appConfig } from './app/app.config';
// import { AppComponent } from './app/app.component';
import { AppModule } from './app/app.module';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { environment } from './environments/environment';
import { enableProdMode, provideZoneChangeDetection } from '@angular/core';

// bootstrapApplication(AppComponent, appConfig).catch((err) =>
//   console.error(err),
// );

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, { applicationProviders: [provideZoneChangeDetection()], applicationProviders: [object Object],})
  .catch(err => console.error(err));