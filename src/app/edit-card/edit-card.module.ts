import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EditCardRoutingModule } from './edit-card-routing.module';
import { EditCardComponent } from './edit-card.component';
import { CardModule } from '../card/card.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { MatExpansionModule } from '@angular/material/expansion';


@NgModule({
  declarations: [
    EditCardComponent
  ],
  imports: [
    CommonModule,
    EditCardRoutingModule,
    CardModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    NgxExtendedPdfViewerModule,
    MatExpansionModule
  ]
})
export class EditCardModule { }
