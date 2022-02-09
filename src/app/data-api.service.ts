import { Injectable } from '@angular/core';
import { Appwrite, Models } from 'appwrite';
import { environment } from 'src/environments/environment';

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
  // $id: string,
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

export const ENTRY_TYPES = {
  DOCUMENTS: 'documents',
  CARDS: 'cards',
};

export type DocumentEntry = Models.Document & DocumentEntryContent;
export type CardEntry = Models.Document & CardEntryContent;
type ENTRY_TYPES = typeof ENTRY_TYPES[keyof typeof ENTRY_TYPES];

@Injectable({
  providedIn: 'root',
})
export class DataApiService {
  private appwrite: Appwrite;

  constructor() {
    this.appwrite = new Appwrite();
    this.appwrite.setEndpoint(environment.API_ENDPOINT);
    this.appwrite.setProject(environment.API_PROJECT);
  }

  createEntry<T extends Models.Document>(
    type: ENTRY_TYPES,
    data: object,
    read = undefined,
    write = undefined
  ) {
    return this.appwrite.database.createDocument<T>(
      environment.collectionMap[type],
      'unique()',
      data,
      read,
      write
    );
  }

  getEntry<T extends Models.Document>(type: ENTRY_TYPES, id: string) {
    return this.appwrite.database.getDocument<T>(environment.collectionMap[type], id);
  }

  updateEntry<T extends Models.Document>(type: ENTRY_TYPES, id: string, data: any) {
    return this.appwrite.database.updateDocument<T>(environment.collectionMap[type], id, data);
  }

  deleteEntry(type: ENTRY_TYPES, id: string) {
    return this.appwrite.database.deleteDocument(environment.collectionMap[type], id);
  }

  listEntries<T extends Models.Document>(type: ENTRY_TYPES) {
    return this.appwrite.database.listDocuments<T>(environment.collectionMap[type]);
  }

  async getDocument(id: string) {
    return await this.getEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS, id);
  }

  async updateDocument(id: string, data: any) {
    return await this.updateEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS, id, data);
  }

  async getCard(id: string) {
    return await this.getEntry<CardEntry>(ENTRY_TYPES.CARDS, id);
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
      Promise.all(imgsToRemove)
        .then(() => {
          this.deleteEntry(ENTRY_TYPES.DOCUMENTS, id)
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
      const removeCardsPromises: Promise<any>[] = [];
      removeCardsPromises.push(this.deleteFile(doc.fileid));
      if (doc.cardIDs) {
        for (let i = 0; i < doc.cardIDs.length; i++) {
          removeCardsPromises.push(this.deleteCard(doc.cardIDs[i]));
        }
      }
      Promise.all(removeCardsPromises)
        .then(() => {
          this.deleteEntry(ENTRY_TYPES.DOCUMENTS, id)
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

  async listDocuments() {
    return (await this.listEntries<DocumentEntry>(ENTRY_TYPES.DOCUMENTS)).documents;
  }

  async createDocument(data: DocumentEntryContent) {
    return await this.createEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS, data);
  }

  getFileView(id: string) {
    return this.appwrite.storage.getFileView(id);
  }
  getFilePreview(id: string) {
    return this.appwrite.storage.getFilePreview(id);
  }

  async saveFile(file: File) {
    return this.appwrite.storage.createFile('unique()', file);
  }

  async deleteFile(id: string) {
    return this.appwrite.storage.deleteFile(id);
  }
}
