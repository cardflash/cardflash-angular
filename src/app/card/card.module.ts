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
import { CardSideComponent } from './card-side/card-side.component';
import { StaticCardSideComponent } from './static-card-side/static-card-side.component'; 
@NgModule({
  declarations: [CardComponent, CardSideComponent, StaticCardSideComponent],
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
    MatStepperModule
  ],
  exports: [CardComponent, CardSideComponent,StaticCardSideComponent]
})
export class CardModule { }
