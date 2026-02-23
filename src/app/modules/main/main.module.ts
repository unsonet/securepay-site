import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainRoutingModule } from './main-routing.module';
import { SharedModule } from '../shared/shared.module';

import { IntroducingPageComponent } from './pages/introducing-page/introducing-page.component';
import { AutomationPageComponent } from './pages/automation-page/automation-page.component';
import { CustomisationPageComponent } from './pages/customisation-page/customisation-page.component';
import { StandardisationPageComponent } from './pages/standardisation-page/standardisation-page.component';
import { InformationPageComponent } from './pages/information-page/information-page.component';
import { ContactPageComponent } from './pages/contact-page/contact-page.component';
import { FeaturesComponent } from '../shared/features/features.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    ContactPageComponent,
    AutomationPageComponent,
    CustomisationPageComponent,
    InformationPageComponent,
    IntroducingPageComponent,
    StandardisationPageComponent,
    FeaturesComponent
  ],
  imports: [
    SharedModule,
    CommonModule,
    MainRoutingModule,
  ]
})
export class MainModule { }
