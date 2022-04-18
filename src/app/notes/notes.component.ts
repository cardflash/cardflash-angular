import { KeyValue } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AttachmentEntry, CardEntry, CardEntryContent, DataApiService, NoteEntry, NoteEntryContent } from '../data-api.service';
import { GraphComponent } from '../graph/graph.component';
import { UserNotifierService } from '../services/notifier/user-notifier.service';
import { UtilsService } from '../utils.service';

type Folder = {name: string, children: Folder[], content: NoteEntry[], attachments: AttachmentEntry[]};

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss']
})

export class NotesComponent implements OnInit, OnDestroy {
  public notes : NoteEntry[]  = [];
  public attachments : AttachmentEntry[]  = [];
  public filteredNotes : NoteEntry[]  = [];
  public newestFirst: boolean = true;

  public isLoading: boolean = true;

  public folders: Folder[] = [];
  
  public currentFolder?: Folder;
  public isRootFolder = false;
  public fileViews: SafeResourceUrl[] = [];
  public folderMode = false;
  @ViewChild('noteGraph') noteGraph?: GraphComponent;

  constructor(private dataApi: DataApiService, private router: Router, private userNotifier: UserNotifierService,public dialog: MatDialog, private utils: UtilsService, private actRoute: ActivatedRoute, private domSanitizer: DomSanitizer) { }

  async ngOnInit() {
    await this.refresh()
    this.actRoute.url.subscribe((url) => {
      // pop 'folder'
      if(url.length === 0){
        this.folderMode = false;
      } else {
        this.folderMode = true;
      }
      console.log({url},this.folders);
      url.shift();
      this.isRootFolder = url.length === 0;
        let folder : Folder = {name: '', children: this.folders, content: this.folderMode ? [] : this.notes, attachments: []};
        for (let i = 0; i < url.length; i++) {
          const u = url[i];
          const found = folder.children.find((f) => f.name === u.path);
          if(found){
            folder = found;
          }else{
            console.error("Folder not found",{url},{folder});
          }
        }
        console.log("Folder found",{url},{folder});
        this.currentFolder = folder;
        this.fileViews = [];
        this.currentFolder.attachments.forEach(async (v,i) => {
          const href = (await this.dataApi.getFileView(v.fileID)).href;
          this.fileViews.push(this.domSanitizer.bypassSecurityTrustResourceUrl(href));
        })
      })
  }

  ngOnDestroy(){
  }

  async refresh(){
    console.log('refresh before',this.notes)
    try{
      this.notes = await this.dataApi.listNotes(this.newestFirst)
    }
    catch(e){
      console.error({e},'refresh notes failed');
    }
    console.log('refresh after',this.notes)
    this.folders = [];
    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];
      this.addFolderPath(note);
    }
    this.attachments = await this.dataApi.listAttachments(this.newestFirst);
    for (let i = 0; i < this.attachments.length; i++) {
      const attachment = this.attachments[i];
      this.addFolderPath(attachment);
    }
    console.log(this.folders,'folders');
    this.filteredNotes = this.notes;
    this.isLoading = false;
    // this.noteGraph?.refreshData();
  }


  // e.g. path = "uni/c/bpi/inductive-mining.md"
  addFolderPath(el: NoteEntry | AttachmentEntry){
    const pathParts = el.path.split('/');
      let folders = this.folders;
      let currFolder;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        currFolder = folders.find((folder) => folder.name === part );
        if(currFolder){
          folders = currFolder.children;
        }else{
          const children : Folder[] = [];
          currFolder = {name: part, children: children, content: [], attachments: []}
          folders.push(currFolder);
          folders = children;
        }
    }
    if(currFolder){
      if('fileID' in el){
        currFolder.attachments.push(el);
      }else{
        currFolder.content.push(el);
      }
    }else{
      console.log({currFolder,el},el.path);
    }
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
    const note = await this.dataApi.createNote({title: `New note ${new Date().toLocaleString()}`, content: '', creationTime: Date.now(), path: '/', meta: ''});
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
          const path = 'webkitRelativePath' in file ? file.webkitRelativePath : undefined;
          await this.dataApi.markdownToNote(file.name.replace('.md',''),content,path);
          console.log({content});
        }else{
          const path = 'webkitRelativePath' in file ? file.webkitRelativePath : '';
          const fileID = await this.dataApi.saveFile(file);
          await this.dataApi.createAttachment({name: file.name, type: file.type, fileID: fileID.$id, meta: '', path: path, creationTime: Date.now()})
          // await this.dataApi.markdownToNote(file.name.replace('.md',''),content,path);
          // console.log({content});
        }
      }

      await this.refresh();
    }
  }

  async fix(){
    for (let i = 0; i < this.notes.length; i++) {
      const n = this.notes[i];
      this.utils.fixNote(n,this.notes)
    }
  }

  async openAttachmentsView(attachment: AttachmentEntry){
    const url = await this.dataApi.getFileView(attachment.fileID);
    window.open(url.href,'_blank');
    // window.location.href = url.href;
  }

}