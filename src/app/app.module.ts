import { AdminModule } from './modules/admin/admin.module';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, PLATFORM_ID } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NotFoundPageComponent } from './modules/shared/pages/not-found-page/not-found-page.component';
import { LoginPageComponent } from './modules/shared/pages/login-page/login-page.component';
import { FeaturesComponent } from './modules/shared/features/features.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ForgottenPasswordPageComponent } from './modules/shared/pages/forgotten-password-page/forgotten-password-page.component';
import { HttpClientModule } from '@angular/common/http';
import { NewPromotionPageComponent } from './modules/admin/pages/promotions/new-promotion-page/new-promotion-page.component';
import { RouterModule } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    NotFoundPageComponent,
    LoginPageComponent,

    ForgottenPasswordPageComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule, //? remove
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,//? remove
    // RouterModule.forRoot([
    //   {
    //     path: '',
    //     component: NewPromotionPageComponent
    //   }, {
    //     path: '*',
    //     component: NewPromotionPageComponent
    //   }, {
    //     path: '**',
    //     component: NewPromotionPageComponent
    //   }
    // ], {
    //   // relativeLinkResolution: 'legacy' 
    // }), //? add
    AdminModule //? add
  ],
  providers: [
    {
      provide: 'format',
      useFactory: (platformId: Object) => isPlatformBrowser(platformId) ? (window as any).format : null,
      deps: [PLATFORM_ID]
    },
    {
      provide: 'CSSParser',
      useFactory: (platformId: Object) => isPlatformBrowser(platformId) ? new (window as any).CSSParser() : null,
      deps: [PLATFORM_ID]
    },
    {
      provide: 'jscsspStyleRule',
      useFactory: (platformId: Object) => isPlatformBrowser(platformId) ? (window as any).jscsspStyleRule : null,
      deps: [PLATFORM_ID]
    },
    {
      provide: 'JsonForm',
      useFactory: (platformId: Object) => isPlatformBrowser(platformId) ? (window as any).JsonForm : null,
      deps: [PLATFORM_ID]
    },
    {
      provide: 'rrule',
      useFactory: (platformId: Object) => isPlatformBrowser(platformId) ? (window as any).rrule : null,
      deps: [PLATFORM_ID]
    }
  ],
  bootstrap: [AppComponent] //?add NewPromotionPageComponent
})
export class AppModule { }
