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
@NgModule({
  declarations: [CardComponent],
  imports: [
    CommonModule,
    CKEditorModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule
  ],
  exports: [CardComponent]
})
export class CardModule { }
