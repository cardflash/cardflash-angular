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
import { DataService } from 'src/app/data.service';
import { DocumentService } from 'src/app/document.service';
import { Card } from 'src/app/types/card';
import { PDFDocument } from 'src/app/types/pdf-document';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
})
export class DocumentsComponent implements OnInit, OnDestroy {
  public documentsCollection: Map<string, PDFDocument> = new Map<
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
    public dataService: DataService,
    public documentsService: DocumentService
  ) {}

  async ngOnInit() {
    this.subscription = this.documentsService.documents$.subscribe((docs) =>
      this.updateData(docs)
    );
  }

  async updateData(docs: Map<string, PDFDocument>) {
    if (docs) {
      this.documentsCollection = docs;
      this.allTags.clear();
      this.documentsCollection.forEach((doc) => {
        doc.tags?.forEach((tag) => {
          if(doc.$id && this.allTags.has(tag)){
            const vals = this.allTags.get(tag);
            if(vals && !vals.has(doc.$id)){
              vals.set(doc.$id,doc);
            }
          }else if(doc.$id){
            this.allTags.set(tag,new Map<string,PDFDocument>([[doc.$id,doc]]));
          }
        })
      })
      this.filterByTags();
    }
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
      const res = await this.dataService.uploadFile(file);
      if (res) {
        const newDoc: PDFDocument = {
          fileid: res,
          name: file.name.replace('.pdf',''),
          localID: nanoid(),
          creationTime: Date.now(),
          currentPage: 1,
          annotations: [],
          cards: [],
          tags: [],
        };
        await this.documentsService.addDocument(newDoc);
      }
      this.isBusy = false;
    }
  }

  deleteDocument(doc: PDFDocument) {
    this.documentsService.deleteDocument(doc);
  }

  addTagToDoc(doc: PDFDocument, tag: string) {
    if (!doc.tags) {
      doc.tags = [];
    }
    if(doc.tags.indexOf(tag) < 0){
      doc.tags.push(tag);
      this.documentsService.updateDocument(doc);
    }
  }

  removeTagFromDoc(doc: PDFDocument, newTag: string) {
    if (!doc.tags) {
      doc.tags = [];
    }
    doc.tags = doc.tags.filter((tag) => tag !== newTag);
    this.documentsService.updateDocument(doc);
  }

  updateNameForDoc(doc: PDFDocument, newName: string){
    doc.name = newName;
    this.documentsService.updateDocument(doc);
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
      this.filteredDocs = this.documentsCollection;
    }
  }
}
