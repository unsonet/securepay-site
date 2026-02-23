import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainLayoutComponent } from './modules/shared/layouts/main-layout/main-layout.component';
import { ForgottenPasswordPageComponent } from './modules/shared/pages/forgotten-password-page/forgotten-password-page.component';
import { LoginPageComponent } from './modules/shared/pages/login-page/login-page.component';
import { NotFoundPageComponent } from './modules/shared/pages/not-found-page/not-found-page.component';
import { NewPromotionPageComponent } from './modules/admin/pages/promotions/new-promotion-page/new-promotion-page.component';
import { MainModule } from './modules/main/main.module';
import { AdminModule } from './modules/admin/admin.module';

const routes: Routes = [
  // {
  //   path: '', loadChildren: () => import('./modules/main/main.module').then(m => m.MainModule)
  // },
  // {
  //   path: 'admin', loadChildren: () => import('./modules/admin/admin.module').then(m => m.AdminModule)
  // },
  { path: '', loadChildren: () => MainModule },
  { path: 'admin', loadChildren: () => AdminModule },
  {path: 'new_promotion_page', component: NewPromotionPageComponent, data: {title: 'New Promotion Page'}},
  { path: 'login', component: LoginPageComponent, data: {title: 'Login'}},
  { path: 'forgotten_password', component: ForgottenPasswordPageComponent, data: {title: 'Forgotten Password'}},
  { path: '404', component: MainLayoutComponent, children: [
    {path: '', component: NotFoundPageComponent, data: {title: 'Invalid Request'}}
  ]},
  { path: '**', redirectTo: '404' }

];

@NgModule({
    imports: [
        RouterModule.forRoot(routes)
    ],
    exports: [
        RouterModule
    ]
})
export class AppRoutingModule { }
