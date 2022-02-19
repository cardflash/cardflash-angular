import { Injectable } from '@angular/core';
import { AppwriteProvider } from './data-api-providers/appwrite-provider';
import { LocalProvider } from './data-api-providers/local-provider';
import { Annotation } from './types/annotation';
import {Config, DataApiProvider, DEFAULT_CONFIG, Entry, ENTRY_TYPES } from './types/data-api-provider';



export interface DocumentEntryContent {
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
}


export type DocumentEntry = Entry & DocumentEntryContent;
export type CardEntry = Entry & CardEntryContent;


@Injectable({
  providedIn: 'root',
})
export class DataApiService {
  private apiProvider: DataApiProvider;
  public config: Config = DEFAULT_CONFIG;
  constructor() {
    try {
      const provider_setting = window.localStorage.getItem('cardflash_provider')
      if(provider_setting !== null && provider_setting === 'appwrite'){
        this.apiProvider = new AppwriteProvider();
      }else if(provider_setting !== null && provider_setting === 'local'){
        this.apiProvider= new LocalProvider();
      }else{
        // Default
        window.localStorage.setItem('cardflash_provider','local');
        this.apiProvider= new LocalProvider();
      }
    } catch (error) {
      console.log('localStorage failed')
      // localStorage fails to work, this properly means that the localProvider will also not work
      // we should instead use the appwrite backend
      this.apiProvider= new AppwriteProvider();
    }
  }


  async fetchConfig(){
    this.config = await this.apiProvider.getPreferences()
  }

  async saveConfig(){
    await this.apiProvider.savePreferences(this.config);
  }

  setProvider(type: 'appwrite' | 'local'){
    try{
      window.localStorage.setItem('cardflash_provider',type);
    }catch(e){
      console.log('could not store provider settings in localStorage',e)
    }
    if(type === 'appwrite'){
      this.apiProvider = new AppwriteProvider();
    }else{
      this.apiProvider = new LocalProvider();
    }
  }

  getProvider() : 'local' | 'appwrite'{
    if(this.apiProvider instanceof AppwriteProvider){
      return 'appwrite';
    }else{
      return 'local';
    }
  } 

  isOfflineMode() : boolean{
    return this.apiProvider instanceof LocalProvider;
  }

  setOfflineMode(toOffline: boolean){
    this.setProvider(toOffline ? 'local' : 'appwrite')
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
    return (await this.apiProvider.listEntries<DocumentEntry>(ENTRY_TYPES.DOCUMENTS,[{type: 'search', attribute: 'cardIDs', values: [cardID]}],undefined)).documents;
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
