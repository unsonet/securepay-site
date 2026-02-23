import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from '../shared/layouts/main-layout/main-layout.component';
import { ContactPageComponent } from './pages/contact-page/contact-page.component';
import { AutomationPageComponent } from './pages/automation-page/automation-page.component';
import { CustomisationPageComponent } from './pages/customisation-page/customisation-page.component';
import { InformationPageComponent } from './pages/information-page/information-page.component';
import { IntroducingPageComponent } from './pages/introducing-page/introducing-page.component';
import { StandardisationPageComponent } from './pages/standardisation-page/standardisation-page.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {path: '', redirectTo: '/', pathMatch: 'full'},
      {path: '', component: IntroducingPageComponent, data: {title: 'Introducing'}},
      {path: 'automation', component: AutomationPageComponent, data: {title: 'Automation'}},
      {path: 'customisation', component: CustomisationPageComponent, data: {title: 'Customisation'}},
      {path: 'standardisation', component: StandardisationPageComponent, data: {title: 'Standardisation'}},
      {path: 'information', component: InformationPageComponent, data: {title: 'Information'}},
      {path: 'contact', component: ContactPageComponent, data: {title: 'Contact Us'}},
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ],
})
export class MainRoutingModule { }
