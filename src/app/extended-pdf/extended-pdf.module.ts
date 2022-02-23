import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExtendedPdfRoutingModule } from './extended-pdf-routing.module';
import { ExtendedPdfComponent } from './extended-pdf.component';
import { AnnotationComponent } from './annotation/annotation.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StaticCardsModule } from '../static-cards/static-cards.module';
import { CardModule } from '../card/card.module';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';


@NgModule({
  declarations: [
    ExtendedPdfComponent,
    AnnotationComponent
  ],
  imports: [
    CommonModule,
    ExtendedPdfRoutingModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    NgxExtendedPdfViewerModule,
    MatProgressSpinnerModule,
    StaticCardsModule,
    CardModule,
    FormsModule,
    MatInputModule
  ]
})
export class ExtendedPdfModule { }
