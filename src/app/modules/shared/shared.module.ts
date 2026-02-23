import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BootstrapSelectDirective } from '@unsonet/ngx-bootstrap-select-directive';
import { AirDatepickerDirective } from '@unsonet/ngx-air-datepicker-directive';
import { SummernoteDirective } from '@unsonet/ngx-summernote-directive';
import { SecurepayPreviewDirective } from '@unsonet/ngx-securepay-preview-directive';
import { PreviewComponent } from './components/preview/preview.component';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { SortablejsModule } from '@unsonet/ngx-sortablejs';
import { MainLayoutComponent } from './../shared/layouts/main-layout/main-layout.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    MainLayoutComponent,
    BootstrapSelectDirective, 
    AirDatepickerDirective, 
    SummernoteDirective, 
    SecurepayPreviewDirective,
    PreviewComponent, 
    SafeHtmlPipe,
  ],
  imports: [
    CommonModule,
    SortablejsModule,
    RouterModule
  ],
  exports:[
    MainLayoutComponent,
    BootstrapSelectDirective, 
    AirDatepickerDirective, 
    SummernoteDirective,
    SecurepayPreviewDirective,
    PreviewComponent,
    SafeHtmlPipe,
    SortablejsModule,
    RouterModule
  ]
})
export class SharedModule { }
