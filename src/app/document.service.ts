import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DataService } from './data.service';
import { PDFDocument } from './types/pdf-document';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  public documents$ : BehaviorSubject<Map<string,PDFDocument>> = new BehaviorSubject<Map<string,PDFDocument>>(new Map<string,PDFDocument>());

  constructor(private dataService: DataService) { 
  }




  async addDocument(doc: PDFDocument){
    const res =await this.dataService.createDocumentOnline('documents', doc);
    this.refresh();
    return res;
  }

  async updateDocument(doc: PDFDocument){
    await this.dataService.updateDocumentOnline('documents', doc);
    this.refresh();
  }

  async deleteDocument(doc: PDFDocument){
    await this.dataService.deleteFile(doc.fileid);
    await this.dataService.deleteDocumentOnline('documents',doc.$id,doc);
    this.refresh();
  }

  async refresh(){
    const documents = await this.dataService.fetchOnlineCollection('documents');
    if(documents){
      this.documents$.next(documents);
    }
  }
  }