import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from './card.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

import { FormsModule } from '@angular/forms';

import {MatCardModule} from '@angular/material/card'
import {MatButtonModule} from '@angular/material/button'; 
import {MatFormFieldModule} from '@angular/material/form-field'; 
import {MatInputModule} from '@angular/material/input'
import {MatIconModule} from '@angular/material/icon'; 
import {MatExpansionModule} from '@angular/material/expansion'; 
import {MatStepperModule} from '@angular/material/stepper';
import { StaticCardSideComponent } from './static-card-side/static-card-side.component';
import { StaticCardComponent } from './static-card/static-card.component';
import { EditCardComponent } from './edit-card/edit-card.component'; 
import { AppRoutingModule } from '../app-routing.module';
import { FlipCardComponent } from './flip-card/flip-card.component';
import { EditorFlipCardComponent } from './editor-flip-card/editor-flip-card.component';
import { MatChipsModule } from '@angular/material/chips';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatMenuModule} from '@angular/material/menu'; 

@NgModule({
  declarations: [CardComponent, StaticCardSideComponent, StaticCardComponent, EditCardComponent, FlipCardComponent, EditorFlipCardComponent],
  imports: [
    CommonModule,
    CKEditorModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
    MatStepperModule,
    AppRoutingModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  exports: [CardComponent,StaticCardSideComponent, StaticCardComponent, FlipCardComponent,EditorFlipCardComponent]
})
export class CardModule { }
