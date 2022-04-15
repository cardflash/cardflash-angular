import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CardEntry, CardEntryContent, DataApiService, NoteEntry, NoteEntryContent } from '../data-api.service';
import { GraphComponent } from '../graph/graph.component';
import { UserNotifierService } from '../services/notifier/user-notifier.service';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss']
})
export class NotesComponent implements OnInit, OnDestroy {
  public notes : NoteEntry[]  = [];
  public filteredNotes : NoteEntry[]  = [];
  public newestFirst: boolean = true;

  public isLoading: boolean = true;

  @ViewChild('noteGraph') noteGraph?: GraphComponent;

  constructor(private dataApi: DataApiService, private router: Router, private userNotifier: UserNotifierService,public dialog: MatDialog) { }

  async ngOnInit() {
    this.refresh()
  }

  ngOnDestroy(){
  }

  async refresh(){
    this.notes = await this.dataApi.listNotes(this.newestFirst)
    this.filteredNotes = this.notes;
    this.isLoading = false;
    this.noteGraph?.refreshData();
  }



  creationTimeOrder(a : KeyValue<string,CardEntry | CardEntryContent>, b : KeyValue<string,CardEntry | CardEntryContent>){
    if(a.value.creationTime && b.value.creationTime){
      return a.value.creationTime < b.value.creationTime ?
            1 : ( a.value.creationTime > b.value.creationTime ? -1 : 0)
    }else{
      if(a.value.creationTime){
        return -1;
      }else if(b.value.creationTime){
        return 1;
      }else{
        return 0;
      }
    }
  }

  async deleteNote(note: NoteEntry | NoteEntryContent){
    if(note.$id){
      this.notes = this.notes.filter((c) => c.$id !== note.$id)
      this.filteredNotes = this.filteredNotes.filter((c) => c.$id !== note.$id)
      await this.dataApi.deleteNote(note.$id);
      await this.noteGraph?.refreshData();
    }
  }

  editNote(note: NoteEntry | NoteEntryContent){
    if(note.$id){
      this.router.navigate(["/notes/"+note.$id+"/edit"])
    }
  }

  viewNote(note: NoteEntry | NoteEntryContent){
    if(note.$id){
      this.router.navigate(["/notes/"+note.$id])
    }
  }

  cardClicked(event: any, note: NoteEntry | NoteEntryContent){
    console.log({event})
    if(event.target && event.target.tagName !== 'MAT-ICON' && event.target.tagName !== 'BUTTON'){
      event.preventDefault();
      this.viewNote(note);
    }
  }

  trackyByNoteId(index: number, note: NoteEntry | NoteEntryContent){
    return note.$id || index;
  }

  search(query: string){
    if(query.length === 0){
      this.filteredNotes = this.notes;
    }else{
      const lower = query.toLowerCase();
      this.filteredNotes = this.notes.filter((note) => {
        // || note.content.toLowerCase().indexOf(lower) >= 0
        return note.title.toLowerCase().indexOf(lower) >= 0;
      })
          }
  }

  async addNew(){
    const note = await this.dataApi.createNote({title: `New note ${new Date().toLocaleString()}`, content: '', creationTime: Date.now()});
    this.router.navigate(['notes',note.$id,'edit']);
  }

  async fileinputChange(fileInput: HTMLInputElement){
    console.log({fileInput})
    if(fileInput.files){

      for (let i = 0; i < fileInput.files?.length; i++) {
        const file = fileInput.files[i];
        console.log({file});
        if(file.type === 'text/markdown'){
          const content = await file.text();
          await this.dataApi.markdownToNote(file.name.replace('.md',''),content);
          console.log({content});
        }
      }

      await this.refresh();
    }
  }

}