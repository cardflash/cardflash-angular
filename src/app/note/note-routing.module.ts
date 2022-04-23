import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotesComponent } from '../notes/notes.component';
import { EditNoteComponent } from './edit-note.component';
import { NoteComponent } from './note.component';

const routes: Routes = [
  {path: ':id', component: NoteComponent},
  {path: ':id/edit', component: EditNoteComponent},
  // { path: '', redirectTo: '/f/notes' },
  {path: 'folder', redirectTo: '/f/notes'},
  {path: 'folder/*', redirectTo: '/f/notes'},

  // {path: '**', component: NotesComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NoteRoutingModule { }
