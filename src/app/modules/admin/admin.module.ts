import { SharedModule } from './../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AdminMainPageComponent } from './pages/others/admin-main-page/admin-main-page.component';
import { CreatePaymentRequestPageComponent } from './pages/payment-requests/create-payment-request-page/create-payment-request-page.component';
import { ImportPaymentRequestPageComponent } from './pages/payment-requests/import-payment-request-page/import-payment-request-page.component';
import { PromotionManagementPageComponent } from './pages/promotions/promotion-management-page/promotion-management-page.component';
import { WorkflowQueuePageComponent } from './pages/monitoring/workflow-queue-page/workflow-queue-page.component';
import { ApiUsagePageComponent } from './pages/monitoring/api-usage-page/api-usage-page.component';
import { PaymentTransactionsPageComponent } from './pages/reports/payment-transactions-page/payment-transactions-page.component';
import { PaymentRequestsSentPageComponent } from './pages/reports/payment-requests-sent-page/payment-requests-sent-page.component';
import { EmailsSentPageComponent } from './pages/reports/emails-sent-page/emails-sent-page.component';
import { UserActivityPageComponent } from './pages/reports/user-activity-page/user-activity-page.component';
import { DailyActivitySummaryPageComponent } from './pages/reports/daily-activity-summary-page/daily-activity-summary-page.component';
import { PaymentsApiSummaryPageComponent } from './pages/reports/payments-api-summary-page/payments-api-summary-page.component';
import { UserManagementPageComponent } from './pages/configuration/user-management-page/user-management-page.component';
import { GroupManagementPageComponent } from './pages/configuration/group-management-page/group-management-page.component';
import { EmailConfigurationPageComponent } from './pages/configuration/email-configuration-page/email-configuration-page.component';
import { AllPaymentTransactionsPageComponent } from './pages/reports/internal/all-payment-transactions-page/all-payment-transactions-page.component';
import { PaymentStatisticsPageComponent } from './pages/reports/internal/payment-statistics-page/payment-statistics-page.component';
import { DailyStatisticsPageComponent } from './pages/reports/internal/daily-statistics-page/daily-statistics-page.component';
import { SmsMessagesSentPageComponent } from './pages/reports/internal/sms-messages-sent-page/sms-messages-sent-page.component';
import { WorkflowsPageComponent } from './pages/configuration/internal/workflows-page/workflows-page.component';
import { EmailPageComponent } from './pages/configuration/internal/email-page/email-page.component';
import { BookingComCredentialsPageComponent } from './pages/configuration/internal/booking-com-credentials-page/booking-com-credentials-page.component';
import { PaymentProcessorsPageComponent } from './pages/configuration/internal/payment-processors-page/payment-processors-page.component';
import { SettingsPageComponent } from './pages/configuration/internal/settings-page/settings-page.component';
import { CustomerMessagingPageComponent } from './pages/messaging/internal/customer-messaging-page/customer-messaging-page.component';
import { OnPageMessagingPageComponent } from './pages/messaging/internal/on-page-messaging-page/on-page-messaging-page.component';
import { FunctionalityManagementPageComponent } from './pages/others/functionality-management-page/functionality-management-page.component';
import { HelpPageComponent } from './pages/others/help-page/help-page.component';
import { ChangePasswordPageComponent } from './pages/user/change-password-page/change-password-page.component';
import { NewPromotionPageComponent } from './pages/promotions/new-promotion-page/new-promotion-page.component';

@NgModule({
  declarations: [
    AdminLayoutComponent,
    AdminMainPageComponent,
    CreatePaymentRequestPageComponent,
    ImportPaymentRequestPageComponent, 
    PromotionManagementPageComponent, 
    WorkflowQueuePageComponent, 
    ApiUsagePageComponent, 
    PaymentTransactionsPageComponent, 
    PaymentRequestsSentPageComponent, 
    EmailsSentPageComponent, 
    UserActivityPageComponent, 
    DailyActivitySummaryPageComponent, 
    PaymentsApiSummaryPageComponent, 
    UserManagementPageComponent, 
    GroupManagementPageComponent,
    EmailConfigurationPageComponent,
    AllPaymentTransactionsPageComponent,
    PaymentStatisticsPageComponent,
    DailyStatisticsPageComponent,
    SmsMessagesSentPageComponent,
    WorkflowsPageComponent,
    EmailPageComponent,
    BookingComCredentialsPageComponent,
    PaymentProcessorsPageComponent,
    SettingsPageComponent,
    CustomerMessagingPageComponent,
    OnPageMessagingPageComponent,
    FunctionalityManagementPageComponent,
    HelpPageComponent,
    ChangePasswordPageComponent,
    NewPromotionPageComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    AdminRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports:[
    NewPromotionPageComponent
  ],
  providers:[
    //{ provide: 'selectpicker', useValue: jQuery['selectpicker']() }
  ]
})
export class AdminModule { }
