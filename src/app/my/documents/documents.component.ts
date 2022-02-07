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
import { Card } from 'src/app/types/card';
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

  public allTags: Map<string,Map<string,PDFDocument>> = new Map<string,Map<string,PDFDocument>>();

  public filteredDocs: Map<string, PDFDocument> = new Map<
  string,
  PDFDocument
>();

  public isBusy: boolean = false;
  public selectedTag: string | undefined = '';
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

  deleteDocument(doc: DocumentEntry) {
    // this.documentsService.deleteDocument(doc);
  }

  addTagToDoc(doc: DocumentEntry, tag: string) {
    if (!doc.tags) {
      doc.tags = [];
    }
    if(doc.tags.indexOf(tag) < 0){
      doc.tags.push(tag);
      // this.documentsService.updateDocument(doc);
    }
  }

  removeTagFromDoc(doc: DocumentEntry, newTag: string) {
    if (!doc.tags) {
      doc.tags = [];
    }
    doc.tags = doc.tags.filter((tag) => tag !== newTag);
    // this.documentsService.updateDocument(doc);
  }

  updateNameForDoc(doc: DocumentEntry, newName: string){
    doc.name = newName;
    // this.documentsService.updateDocument(doc);
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
    if(this.selectedTag){
      const filtered = this.allTags.get(this.selectedTag);
      if(filtered){
        this.filteredDocs = filtered
      }
    }else{
      // this.filteredDocs = this.documentsCollection;
    }
  }
}
