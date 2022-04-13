import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NoteRoutingModule } from './note-routing.module';
import { NoteComponent } from './note.component';
import { NotesComponent } from '../notes/notes.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { EditNoteComponent } from './edit-note.component';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { GraphModule } from '../graph/graph.module';
import { MatMenuModule } from '@angular/material/menu';


@NgModule({
  declarations: [
    NoteComponent,
    NotesComponent,
    EditNoteComponent
  ],
  imports: [
    CommonModule,
    CKEditorModule,
    NoteRoutingModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    // MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    GraphModule,
    MatMenuModule
  ],
  exports: [EditNoteComponent]
})
export class NoteModule { }
