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
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { LoginComponent } from './account/login/login.component';
import { CardsComponent } from './cards/cards.component'; 
import {MatSidenavModule} from '@angular/material/sidenav'; 
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import { DocumentsComponent } from './my/documents/documents.component';
import { MatCardModule } from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips'; 
import {MatExpansionModule} from '@angular/material/expansion'; 
import { CardsForDocumentComponent } from './my/documents/cards-for-document/cards-for-document.component';
import { OptionsComponent } from './options/options.component';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import { ExtendedPdfComponent } from './extended-pdf/extended-pdf.component';
import { AnnotationComponent } from './extended-pdf/annotation/annotation.component'; 
import {MatMenuModule} from '@angular/material/menu'; 
import {MatDialogModule} from '@angular/material/dialog';
import { CardDialogWrapperComponent } from './card-dialog-wrapper/card-dialog-wrapper.component';
import { StudyCardUiComponent } from './study-card-ui/study-card-ui.component';
import { StudyComponent } from './study/study.component'; 
@NgModule({
  declarations: [
    AppComponent,
    NotificationComponent,
    LoginComponent,
    CardsComponent,
    DocumentsComponent,
    CardsForDocumentComponent,
    OptionsComponent,
    ExtendedPdfComponent,
    AnnotationComponent,
    CardDialogWrapperComponent,
    StudyCardUiComponent,
    StudyComponent,
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
    MatSidenavModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatMenuModule,
    MatDialogModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerImmediately'
    })
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
