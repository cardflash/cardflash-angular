import { Injectable } from '@angular/core';
import { Appwrite, Models, Query } from 'appwrite';
import { REPL_MODE_SLOPPY } from 'repl';
import { environment } from 'src/environments/environment';
import { AppwriteProvider } from './data-api-providers/appwrite-provider';
import { LocalProvider } from './data-api-providers/local-provider';
import { DataService } from './data.service';
import { Annotation } from './types/annotation';
import { DataApiProvider } from './types/data-api-provider';

export interface DocumentEntryContent {
  // $id: string,
  name: string;
  fileid: string;
  creationTime: number;
  currentPage: number;
  tags?: string[];
  annotationsJSON?: string[];
  cardIDs?: string[];
  // $collection?: string,
  // $read?: string[],
  // $write?: string[]
}

export interface CardEntryContent {
  $id?: string,
  front: string;
  back: string;
  page: number;
  hiddenText: string;
  chapter: string;
  title: string;
  creationTime: number;
  imgIDs?: string[];
  // $collection?: string,
  // $read?: string[],
  // $write?: string[]
}

interface EntryWithCreationTime extends Models.Document {
  creationTime: number
}

export const ENTRY_TYPES = {
  DOCUMENTS: 'documents',
  CARDS: 'cards',
};

type ENTRY_TYPES = typeof ENTRY_TYPES[keyof typeof ENTRY_TYPES];
export type DocumentEntry = Models.Document & DocumentEntryContent;
export type CardEntry = Models.Document & CardEntryContent;

@Injectable({
  providedIn: 'root',
})
export class DataApiService {
  private apiProvider: DataApiProvider;

  constructor(private dataService: DataService) {
    this.apiProvider = new LocalProvider();
    dataService.init().then((res) => {
      console.log(dataService.offlineMode)
      if(!dataService.offlineMode){
        this.apiProvider = new AppwriteProvider();
      }else{
        this.apiProvider = new LocalProvider();
      }
    })
  }

  setProvider(type: 'appwrite' | 'local'){
    if(type === 'appwrite'){
      this.apiProvider = new AppwriteProvider();
    }else{
      this.apiProvider = new LocalProvider();
    }
  }

  async getDocument(id: string) {
    return await this.apiProvider.getEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS, id);
  }

  async updateDocument(id: string, data: any) {
    return await this.apiProvider.updateEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS, id, data);
  }

  async updateCard(id: string, data: any) {
    return await this.apiProvider.updateEntry<CardEntry>(ENTRY_TYPES.CARDS, id, data);
  }


  async getCard(id: string) {
    return await this.apiProvider.getEntry<CardEntry>(ENTRY_TYPES.CARDS, id);
  }
  
  deleteCard(id: string) {
    return new Promise<void>(async (resolve, reject) => {
      const toDelete = await this.getCard(id);
      const imgsToRemove: Promise<any>[] = [];
      if (toDelete.imgIDs) {
        for (let i = 0; i < toDelete.imgIDs.length; i++) {
          imgsToRemove.push(this.deleteFile(toDelete.imgIDs[i]));
        }
      }
      (await this.listDocumentsForCard(id)).forEach((doc) => {
        const cardIDs = doc.cardIDs || [];
        imgsToRemove.push(this.updateDocument(doc.$id,{cardIDs: cardIDs.filter((c) => c !== id)}))
      })
      Promise.all(imgsToRemove)
        .then(() => {
          this.apiProvider.deleteEntry(ENTRY_TYPES.CARDS, id)
            .then(() => {
              resolve();
            })
            .catch((reason) => {
              reject('Deleting card failed (but images are deleted) ' + reason);
            });
        })
        .catch((reason) => {
          reject('Deleting image failed ' + reason);
        });
    });
  }

  async deleteDocument(id: string, doc: DocumentEntryContent) {
    return new Promise<void>((resolve, reject) => {
      // TODO: Do we really want to delete all cards when a document is deleted? or let there be orphan-cards?
      // -> Deleting document -> Delete all cards -> Delete all images from all cards
      // is quite a heavy operation
      // For now: No! But: Delete all annotation images
      const additionalPromises: Promise<any>[] = [];
      additionalPromises.push(this.deleteFile(doc.fileid));
      if(doc.annotationsJSON){
        for (let i = 0; i < doc.annotationsJSON.length; i++) {
          const annotation : Annotation = JSON.parse(doc.annotationsJSON[i])
          if (annotation.imgID !== undefined) {
            additionalPromises.push(this.deleteFile(annotation.imgID))
          }
        }
      }
      // if (doc.cardIDs) {
      //   for (let i = 0; i < doc.cardIDs.length; i++) {
      //     removeCardsPromises.push(this.deleteCard(doc.cardIDs[i]));
      //   }
      // }
      Promise.all(additionalPromises)
        .then(() => {
          this.apiProvider.deleteEntry(ENTRY_TYPES.DOCUMENTS, id)
            .then(() => {
              resolve();
            })
            .catch((reason) => {
              reject('Deleting document failed (but cards are deleted) ' + reason);
            });
        })
        .catch((reason) => {
          reject('Deleting cards failed ' + reason);
        });
    });
  }

  async listDocuments(newestFirst: boolean) {
    return (await this.apiProvider.listEntries<DocumentEntry>(ENTRY_TYPES.DOCUMENTS,undefined,newestFirst)).documents;
  }
  async listDocumentsForCard(cardID: string){
    return (await this.apiProvider.listEntries<DocumentEntry>(ENTRY_TYPES.DOCUMENTS,[Query.search('cardIDs',cardID)],undefined)).documents;
  }
  async listCards(newestFirst: boolean) {
    return (await this.apiProvider.listEntries<CardEntry>(ENTRY_TYPES.CARDS,undefined,newestFirst)).documents;
  }

  async createDocument(data: DocumentEntryContent) {
    return await this.apiProvider.createEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS, data);
  }

  async createCard(data: CardEntryContent) {
    return await this.apiProvider.createEntry<CardEntry>(ENTRY_TYPES.CARDS, data);
  }

  getFileView(id: string) {
    console.log('getFileView in data api',{id})
    return this.apiProvider.getFileView(id);
  }
  getFilePreview(id: string) {
    return this.apiProvider.getFilePreview(id);
  }

  saveFile(file: File) {
    return this.apiProvider.saveFile(file);
  }

 deleteFile(id: string) {
    return this.apiProvider.deleteFile(id);
  }
}
