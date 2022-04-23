import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FoldersRoutingModule } from './folders-routing.module';
import { FoldersComponent } from './folders.component';
import { NoteModule } from '../note/note.module';


@NgModule({
  declarations: [
    FoldersComponent
  ],
  imports: [
    CommonModule,
    FoldersRoutingModule,
    NoteModule
  ]
})
export class FoldersModule { }
