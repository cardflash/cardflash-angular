import { KeyValue } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { nanoid } from 'nanoid';
import { Subscription } from 'rxjs';
import { DataService } from 'src/app/data.service';
import { PDFDocument } from 'src/app/types/pdf-document';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
})
export class DocumentsComponent implements OnInit {
  public documentsCollection: Map<string, PDFDocument> = new Map<
    string,
    PDFDocument
  >();
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  constructor(public dataService: DataService) {}

  async ngOnInit() {
    this.updateData();
  }

  async updateData(){
    const res = await this.dataService.fetchOnlineCollection('documents');
    if(res){
      this.documentsCollection = res;
    }
  }

  ngOnDestroy() {}

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

  async uploadDocument(){
    const file = this.getFile();
    if(file){
      const res = await this.dataService.uploadFile(file);
      if(res){
        const newDoc : PDFDocument = {
          fileid: res,
          name: file.name,
          localID: nanoid(),
          creationTime: Date.now(),
          currentPage: 1,
          annotations: [],
          cards: []
        }
        const doc = await this.dataService.createDocumentOnline('documents',newDoc,newDoc.localID,true);
    this.updateData();
      }
    }
  }
}
