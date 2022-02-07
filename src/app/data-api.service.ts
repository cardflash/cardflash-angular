import { Injectable } from '@angular/core';
import { Appwrite, Models } from 'appwrite';
import { environment } from 'src/environments/environment';



export interface DocumentEntryContent{
  // $id: string,
  name: string,
  fileid: string,
  creationTime: number,
  currentPage: number,
  tags?: string[]
  annotationsJSON?: string[],
  cardIDs?: string[],
  // $collection?: string,
  // $read?: string[],
  // $write?: string[]
}

export const ENTRY_TYPES = {
  DOCUMENTS: 'documents',
  CARDS: 'cards'

}

export type DocumentEntry = Models.Document & DocumentEntryContent 
type ENTRY_TYPES = typeof ENTRY_TYPES[keyof typeof ENTRY_TYPES];

@Injectable({
  providedIn: 'root'
})

export class DataApiService {


  private appwrite : Appwrite;
  
  constructor() {
    this.appwrite = new Appwrite();
    this.appwrite.setEndpoint(environment.API_ENDPOINT);
    this.appwrite.setProject(environment.API_PROJECT);
  }


  createEntry<T extends Models.Document>(type: ENTRY_TYPES, data: object, read = undefined, write = undefined){
    return this.appwrite.database.createDocument<T>(environment.collectionMap[type],'unique()',data,read,write)
  }

  getEntry<T extends Models.Document>(type: ENTRY_TYPES, id: string){
    return this.appwrite.database.getDocument<T>(environment.collectionMap[type],id)
  }

  updateEntry<T extends Models.Document>(type: ENTRY_TYPES, id: string, data: any){
    return this.appwrite.database.updateDocument<T>(environment.collectionMap[type],id,data)
  }

  listEntries<T extends Models.Document>(type: ENTRY_TYPES){
    return this.appwrite.database.listDocuments<T>(environment.collectionMap[type])
  }

  async getDocument(id: string){
    return await this.getEntry<(DocumentEntry)>(ENTRY_TYPES.DOCUMENTS,id)
  }

  async updateDocument(id: string,data: any){
    return await this.updateEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS,id,data)
  }

  async listDocuments(){
    return (await this.listEntries<DocumentEntry>(ENTRY_TYPES.DOCUMENTS)).documents
  }

  async createDocument(data: DocumentEntryContent){
    return await this.createEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS,data)
  }


  getFileView(id: string){
    return this.appwrite.storage.getFileView(id);
  }

  async saveFile(file: File){
    return this.appwrite.storage.createFile('unique()',file);
  }


}
