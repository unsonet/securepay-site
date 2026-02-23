import { HelpPageComponent } from './pages/others/help-page/help-page.component';
import { FunctionalityManagementPageComponent } from './pages/others/functionality-management-page/functionality-management-page.component';
import { OnPageMessagingPageComponent } from './pages/messaging/internal/on-page-messaging-page/on-page-messaging-page.component';
import { ChangePasswordPageComponent } from './pages/user/change-password-page/change-password-page.component';
import { WorkflowsPageComponent } from './pages/configuration/internal/workflows-page/workflows-page.component';
import { SettingsPageComponent } from './pages/configuration/internal/settings-page/settings-page.component';
import { EmailPageComponent } from './pages/configuration/internal/email-page/email-page.component';
import { BookingComCredentialsPageComponent } from './pages/configuration/internal/booking-com-credentials-page/booking-com-credentials-page.component';
import { UserManagementPageComponent } from './pages/configuration/user-management-page/user-management-page.component';
import { GroupManagementPageComponent } from './pages/configuration/group-management-page/group-management-page.component';
import { EmailConfigurationPageComponent } from './pages/configuration/email-configuration-page/email-configuration-page.component';
import { SmsMessagesSentPageComponent } from './pages/reports/internal/sms-messages-sent-page/sms-messages-sent-page.component';
import { PaymentStatisticsPageComponent } from './pages/reports/internal/payment-statistics-page/payment-statistics-page.component';
import { DailyStatisticsPageComponent } from './pages/reports/internal/daily-statistics-page/daily-statistics-page.component';
import { AllPaymentTransactionsPageComponent } from './pages/reports/internal/all-payment-transactions-page/all-payment-transactions-page.component';
import { UserActivityPageComponent } from './pages/reports/user-activity-page/user-activity-page.component';
import { PaymentsApiSummaryPageComponent } from './pages/reports/payments-api-summary-page/payments-api-summary-page.component';
import { PaymentTransactionsPageComponent } from './pages/reports/payment-transactions-page/payment-transactions-page.component';
import { PaymentRequestsSentPageComponent } from './pages/reports/payment-requests-sent-page/payment-requests-sent-page.component';
import { EmailsSentPageComponent } from './pages/reports/emails-sent-page/emails-sent-page.component';
import { DailyActivitySummaryPageComponent } from './pages/reports/daily-activity-summary-page/daily-activity-summary-page.component';
import { WorkflowQueuePageComponent } from './pages/monitoring/workflow-queue-page/workflow-queue-page.component';
import { ApiUsagePageComponent } from './pages/monitoring/api-usage-page/api-usage-page.component';
import { PromotionManagementPageComponent } from './pages/promotions/promotion-management-page/promotion-management-page.component';
import { NgModule } from '@angular/core';

import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from '../shared/pages/login-page/login-page.component';
import { AdminMainPageComponent } from './pages/others/admin-main-page/admin-main-page.component';

import { CreatePaymentRequestPageComponent } from './pages/payment-requests/create-payment-request-page/create-payment-request-page.component';
import { ImportPaymentRequestPageComponent } from './pages/payment-requests/import-payment-request-page/import-payment-request-page.component';

import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AuthGuard } from './guards/auth.guard';
import { PaymentProcessorsPageComponent } from './pages/configuration/internal/payment-processors-page/payment-processors-page.component';
import { CustomerMessagingPageComponent } from './pages/messaging/internal/customer-messaging-page/customer-messaging-page.component';
import { NewPromotionPageComponent } from './pages/promotions/new-promotion-page/new-promotion-page.component';

const routes: Routes = [
  {
    path: '', component: AdminLayoutComponent, children: [
      //{ path: '', redirectTo: '/admin/login',pathMatch: 'full' },
      //{ path: 'login', component: LoginPageComponent, canActivate: [AuthGuard], data: { title: 'Login to admin panel' } },
      { path: '', component: AdminMainPageComponent, canActivate: [AuthGuard], data: { title: 'Admin panel' } },
      { path: 'payment_requests', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/payment_requests/import', pathMatch: 'full'},
          {path: 'import', component: ImportPaymentRequestPageComponent, data: {title: 'Import Payment Requests'}},
          {path: 'create', component: CreatePaymentRequestPageComponent, data: {title: 'Create Payment Requests'}},
        ]
      },
      { path: 'promotions', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/promotions/promotion_management', pathMatch: 'full'},
          {path: 'promotion_management', component: PromotionManagementPageComponent, data: {title: 'Promotion Management'}},
          {path: 'new_promotion', component: NewPromotionPageComponent, data: {title: 'New Promotion'}},
        ]
      },
      { path: 'monitoring', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/promotions/api_usage', pathMatch: 'full'},
          {path: 'api_usage', component: ApiUsagePageComponent, data: {title: 'Api Usage'}},
          {path: 'workflow_queue', component: WorkflowQueuePageComponent, data: {title: 'Workflow Queue'}},
        ]
      },
      { path: 'reports', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/reports/api_usage', pathMatch: 'full'},
          {path: 'daily_activity_summary', component: DailyActivitySummaryPageComponent, data: {title: 'Daily Activity Summary'}},
          {path: 'emails_sent', component: EmailsSentPageComponent, data: {title: 'Emails Sent'}},
          {path: 'payment_requests_sent', component: PaymentRequestsSentPageComponent, data: {title: 'Payment Requests Sent'}},
          {path: 'payment_transactions', component: PaymentTransactionsPageComponent, data: {title: 'Payment Transactions'}},
          {path: 'payments_api_summary', component: PaymentsApiSummaryPageComponent, data: {title: 'Payments Api Summary'}},
          {path: 'user_activity', component: UserActivityPageComponent, data: {title: 'User Activity'}},
        ]
      },
      { path: 'reports/internal', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/reports/internal/all_payments', pathMatch: 'full'},
          {path: 'all_payments', component: AllPaymentTransactionsPageComponent, data: {title: 'All Payment Transactions'}},
          {path: 'daily_statistics', component: DailyStatisticsPageComponent, data: {title: 'Daily Statistics'}},
          {path: 'payment_statistics', component: PaymentStatisticsPageComponent, data: {title: 'Payment Statistics'}},
          {path: 'sms_messages_sent', component: SmsMessagesSentPageComponent, data: {title: 'SMS Messages Sent'}},
        ]
      },
      { path: 'configuration', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/configuration/email_configuration', pathMatch: 'full'},
          {path: 'email_configuration', component: EmailConfigurationPageComponent, data: {title: 'Email Configuration'}},
          {path: 'group_management', component: GroupManagementPageComponent, data: {title: 'Group Management'}},
          {path: 'user_management', component: UserManagementPageComponent, data: {title: 'User Management'}},
        ]
      },
      { path: 'configuration/internal', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/configuration/internal/booking_com_credentials', pathMatch: 'full'},
          {path: 'booking_com_credentials', component: BookingComCredentialsPageComponent, data: {title: 'Booking.com Credentials'}},
          {path: 'email', component: EmailPageComponent, data: {title: 'Email'}},
          {path: 'payment_processors', component: PaymentProcessorsPageComponent, data: {title: 'Payment Processors'}},
          {path: 'settings', component: SettingsPageComponent, data: {title: 'Settings'}},
          {path: 'workflows', component: WorkflowsPageComponent, data: {title: 'Workflows'}},
        ]
      },
      { path: 'user', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/user/change_password', pathMatch: 'full'},
          {path: 'change_password', component: ChangePasswordPageComponent, data: {title: 'Change Password'}},
        ]
      },
      { path: 'messaging', redirectTo: '/admin/messaging/internal',pathMatch: 'full' },
      { path: 'messaging/internal', canActivate: [AuthGuard], 
        children: [
          {path: '', redirectTo: '/admin/messaging/internal/customer_messaging', pathMatch: 'full'},
          {path: 'customer_messaging', component: CustomerMessagingPageComponent, data: {title: 'Customer Messaging'}},
          {path: 'on_page_messaging', component: OnPageMessagingPageComponent, data: {title: 'On-Page Messaging'}},
        ]
      },
      {path: 'functionality_management', component: FunctionalityManagementPageComponent, data: {title: 'Functionality Management'}},
      {path: 'help', component: HelpPageComponent, data: {title: "Help & FAQ's"}},
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [
    RouterModule
  ]
})
export class AdminRoutingModule { }
