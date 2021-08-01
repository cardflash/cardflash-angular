import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { CardModule } from './card/card.module';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

import { NotificationComponent } from './services/notifier/notification/notification.component';

import {MatSnackBarModule} from '@angular/material/snack-bar'; 
import {MatButtonModule} from '@angular/material/button'; 
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select'; 
import {MatFormFieldModule} from '@angular/material/form-field'; 
import { FormsModule } from '@angular/forms';
import {ReactiveFormsModule} from '@angular/forms'
import { MatInputModule } from '@angular/material/input';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { LoginComponent } from './account/login/login.component';
import { FromPdfComponent } from './create/from-pdf/from-pdf.component';
import { CardsComponent } from './cards/cards.component'; 
import {MatSidenavModule} from '@angular/material/sidenav'; 
import {MatTabsModule} from '@angular/material/tabs';
import { DocumentsComponent } from './my/documents/documents.component';
import { MatCardModule } from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips'; 
import { CardsForDocumentComponent } from './my/documents/cards-for-document/cards-for-document.component';
@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    LoginComponent,
    FromPdfComponent,
    CardsComponent,
    DocumentsComponent,
    CardsForDocumentComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    CardModule,
    NgxExtendedPdfViewerModule,
    MatSnackBarModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSidenavModule,
    MatTabsModule,
    MatCardModule,
    MatChipsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerImmediately'
    })
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
