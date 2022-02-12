import { KeyValue } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { nanoid } from 'nanoid';
import { Subscription } from 'rxjs';
import { DataApiService, DocumentEntry, DocumentEntryContent } from 'src/app/data-api.service';
import { DataService } from 'src/app/data.service';
import { DocumentService } from 'src/app/document.service';
import { UserNotifierService } from 'src/app/services/notifier/user-notifier.service';
import { PDFDocument } from 'src/app/types/pdf-document';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
})
export class DocumentsComponent implements OnInit, OnDestroy {

  public documentPromise: Promise<DocumentEntry[]> | undefined;
  public doc: Map<string, PDFDocument> = new Map<
    string,
    PDFDocument
  >();

  public allTags: string[] = [];

  public filteredDocs: Map<string, PDFDocument> = new Map<
  string,
  PDFDocument
>();

  public isBusy: boolean = false;
  public selectedTag: string | undefined = undefined;
  subscription: Subscription | undefined;

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  constructor(
  //   public dataService: DataService,
  //   public documentsService: DocumentService,
  public dataApi: DataApiService,
    public userNotifier: UserNotifierService
  ) {}

  async ngOnInit() {
    this.userNotifier.loadStatus = 60;
    this.refresh();
  //   this.subscription = this.documentsService.documents$.subscribe((docs) => {
  //     if (docs !== undefined){
  //       this.userNotifier.loadStatus = 80;
  //       this.updateData(docs)
  //       this.userNotifier.loadStatus = 100;
  //     }
  // }
    // );
  }

  refresh(){
    this.documentPromise = this.dataApi.listDocuments();
    this.documentPromise.then((docs) => {
      const tags : Set<string> = new Set<string>();
      for (const doc of docs){
        if(doc.tags){
          doc.tags.forEach((tag) => tags.add(tag))
        }
      }
      this.allTags = [...tags.values()];
    })

  }

  async updateData(docs: Document[]) {
    // if (docs) {
    //   this.documentsCollection = docs;
    //   this.allTags.clear();
    //   this.documentsCollection.forEach((doc) => {
    //     doc.tags?.forEach((tag) => {
    //       if(doc.$id && this.allTags.has(tag)){
    //         const vals = this.allTags.get(tag);
    //         if(vals && !vals.has(doc.$id)){
    //           vals.set(doc.$id,doc);
    //         }
    //       }else if(doc.$id){
    //         this.allTags.set(tag,new Map<string,PDFDocument>([[doc.$id,doc]]));
    //       }
    //     })
    //   })
    //   this.filterByTags();
    // }
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  creationTimeOrder(
    a: KeyValue<string, PDFDocument>,
    b: KeyValue<string, PDFDocument>
  ) {
    if (a.value.creationTime && b.value.creationTime) {
      return a.value.creationTime < b.value.creationTime
        ? 1
        : a.value.creationTime > b.value.creationTime
        ? -1
        : 0;
    } else {
      if (a.value.creationTime) {
        return -1;
      } else if (b.value.creationTime) {
        return 1;
      } else {
        return 0;
      }
    }
  }

  getFile() {
    console.log(this.fileInputRef);
    if (this.fileInputRef) {
      if (
        this.fileInputRef?.nativeElement.files &&
        this.fileInputRef?.nativeElement.files.length === 1
      ) {
        return this.fileInputRef?.nativeElement.files[0];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  async uploadDocument() {
    const file = this.getFile();
    if (file) {
      this.isBusy = true;
      const res = await this.dataApi.saveFile(file);
      if (res) {
        const newDoc: DocumentEntryContent = {
          fileid: res.$id,
          name: file.name.replace('.pdf',''),
          creationTime: Date.now(),
          currentPage: 1,
          annotationsJSON: [],
          cardIDs: [],
          tags: [],
        };
        await this.dataApi.createDocument(newDoc);
        this.refresh()
      }
      this.isBusy = false;
    }
  }

  async deleteDocument(doc: DocumentEntry) {
    await this.dataApi.deleteDocument(doc.$id,doc)
    this.refresh()
  }

  addTagToDoc(doc: DocumentEntry, tag: string) {
    this.allTags = [...new Set([...this.allTags,tag])]
    if (!doc.tags) {
      doc.tags = [];
    }
    if(doc.tags.indexOf(tag) < 0){
      doc.tags.push(tag);
      this.dataApi.updateDocument(doc.$id,{tags: doc.tags})
    }
  }

  removeTagFromDoc(doc: DocumentEntry, newTag: string) {
    if (!doc.tags) {
      doc.tags = [];
    }
    doc.tags = doc.tags.filter((tag) => tag !== newTag);
    this.dataApi.updateDocument(doc.$id,{tags: doc.tags})
  }

  updateNameForDoc(doc: DocumentEntry, newName: string){
    doc.name = newName;
    this.dataApi.updateDocument(doc.$id,{name: newName})
  }

  tagClicked(value: string){
    if(this.selectedTag === value){
      this.selectedTag  = undefined;
    }else{
      this.selectedTag  = value;
    }
    this.filterByTags()
  }

  filterByTags(){
    // if(this.selectedTag){
    //   const filtered = this.allTags.get(this.selectedTag);
    //   if(filtered){
    //     this.filteredDocs = filtered
    //   }
    // }else{
    //   // this.filteredDocs = this.documentsCollection;
    // }
  }
}
