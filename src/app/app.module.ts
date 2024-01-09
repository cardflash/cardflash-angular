import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { LoginComponent } from './account/login/login.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CardDialogWrapperComponent } from './card-dialog-wrapper/card-dialog-wrapper.component';
import { CardsComponent } from './cards/cards.component';
import { CardsForDocumentComponent } from './my/documents/cards-for-document/cards-for-document.component';
import { OptionsComponent } from './options/options.component';
import { NotificationComponent } from './services/notifier/notification/notification.component';
import { StaticCardsModule } from './static-cards/static-cards.module';
import { StudyCardUiComponent } from './study-card-ui/study-card-ui.component';
import { StudyComponent } from './study/study.component';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import { ViewCardComponent } from './view-card/view-card.component';
import { MatCard, MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    LoginComponent,
    CardsComponent,
    CardsForDocumentComponent,
    OptionsComponent,
    CardDialogWrapperComponent,
    StudyCardUiComponent,
    StudyComponent,
    ViewCardComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
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
    MatSidenavModule,
    MatCardModule,
    NgxExtendedPdfViewerModule,
    // MatCardModule,
    // MatChipsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    // MatMenuModule,
    MatDialogModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerImmediately'
    }),
    StaticCardsModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  exports: []
})
export class AppModule { }
