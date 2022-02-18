import {
  DataApiProvider,
  Entry,
  EntryWithCreationTime,
  ENTRY_TYPES,
} from '../types/data-api-provider';

import { Appwrite, Models } from 'appwrite';
import { environment } from 'src/environments/environment';

export class AppwriteProvider implements DataApiProvider {
  private appwrite: Appwrite;

  constructor() {
    this.appwrite = new Appwrite();
    this.appwrite.setEndpoint(environment.API_ENDPOINT);
    this.appwrite.setProject(environment.API_PROJECT);
  }

  createEntry<T extends Entry>(
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

  getEntry<T extends Entry>(type: ENTRY_TYPES, id: string) {
    return this.appwrite.database.getDocument<T>(environment.collectionMap[type], id);
  }

  updateEntry<T extends Models.Document>(type: ENTRY_TYPES, id: string, data: any) {
    return this.appwrite.database.updateDocument<T>(environment.collectionMap[type], id, data);
  }

  deleteEntry(type: ENTRY_TYPES, id: string) {
    return this.appwrite.database.deleteDocument(environment.collectionMap[type], id);
  }

  listEntries<T extends EntryWithCreationTime>(
    type: ENTRY_TYPES,
    queries: string[] | undefined,
    newestFirst: boolean | undefined
  ) {
    console.log({ newestFirst });
    return this.appwrite.database.listDocuments<T>(
      environment.collectionMap[type],
      queries,
      100,
      undefined,
      undefined,
      undefined,
      ['creationTime'],
      [newestFirst ? 'DESC' : 'ASC']
    );
  }

  async getFileView(id: string) {
    return this.appwrite.storage.getFileView(id);
  }
  async getFilePreview(id: string) {
    return this.appwrite.storage.getFilePreview(id);
  }

  async saveFile(file: File) {
    return this.appwrite.storage.createFile('unique()', file);
  }

  async deleteFile(id: string) {
    return this.appwrite.storage.deleteFile(id);
  }
}
