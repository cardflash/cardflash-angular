import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotesComponent } from '../notes/notes.component';
import { EditNoteComponent } from './edit-note.component';
import { NoteComponent } from './note.component';

const routes: Routes = [{ path: '', component: NotesComponent },{path: ':id', component: NoteComponent},{path: ':id/edit', component: EditNoteComponent}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NoteRoutingModule { }
