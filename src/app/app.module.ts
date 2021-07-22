import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CardComponent } from './card/card.component';
import { HttpClientModule } from '@angular/common/http';
import { CardModule } from './card/card.module';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

import {MatSnackBarModule} from '@angular/material/snack-bar'; 
import { UserNotifierService } from './services/notifier/user-notifier.service';
import { NotificationComponent } from './services/notifier/notification/notification.component';

import {MatButtonModule} from '@angular/material/button'; 
@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    CardModule,
    NgxExtendedPdfViewerModule,
    MatSnackBarModule,
    MatButtonModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
