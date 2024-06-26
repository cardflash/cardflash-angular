import {
  Config,
  DataApiProvider,
  DEFAULT_CONFIG,
  Entry,
  EntryWithCreationTime,
  ENTRY_TYPES,
  QueryOption,
} from '../types/data-api-provider';

import { Appwrite, Models, Query } from 'appwrite';
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
    console.log("createEntry",{type,data})
    return this.appwrite.database.createDocument<T>(environment.collectionMap[type],'unique()',data)
    // return this.appwrite.database.createDocument<T>(
    //   environment.collectionMap[type],
    //   'unique()',
    //   data,
    //   read,
    //   write
    // );
  }

  getEntry<T extends Entry>(type: ENTRY_TYPES, id: string) {
    console.log({id,type},environment.collectionMap[type])
    return this.appwrite.database.getDocument<T>(environment.collectionMap[type],id)
    // return this.appwrite.database.getDocument<T>(environment.collectionMap[type], id);
  }

  updateEntry<T extends Models.Document>(type: ENTRY_TYPES, id: string, data: any) {
    return this.appwrite.database.updateDocument<T>(environment.collectionMap[type], id, data);
  }

  deleteEntry(type: ENTRY_TYPES, id: string) {
    return this.appwrite.database.deleteDocument(environment.collectionMap[type], id);
  }

  async listEntries<T extends EntryWithCreationTime>(
    type: ENTRY_TYPES,
    queries: QueryOption[] | undefined,
    newestFirst: boolean | undefined
  ) {
    const appwriteQueries : string[] = [];
    if(queries !== undefined){
      for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        let appwriteq : string;
        switch (q.type) {
          case 'search':
            appwriteq = Query.search(q.attribute,q.values[0])
            break;
          case '<':
            appwriteq = Query.lesser(q.attribute,q.values)
            break;
          case '<=':
            appwriteq = Query.lesserEqual(q.attribute,q.values)
            break;
            case '<':
              appwriteq = Query.lesser(q.attribute,q.values)
              break;
            case '<=':
              appwriteq = Query.lesserEqual(q.attribute,q.values)
              break;
          default:
            appwriteq = Query.equal(q.attribute,q.values)
            break;
        }
        appwriteQueries.push(appwriteq)
        
      }
    }
    const results : T[]= [];
    let response = await this.appwrite.database.listDocuments<T>(
      environment.collectionMap[type],
      appwriteQueries,
      100,
      undefined,
      undefined,
      undefined,
      ['creationTime'],
      [newestFirst ? 'DESC' : 'ASC']
      );
      results.push(...response.documents)
      console.log({ len: response.total });
   while(results.length < response.total){
    let response = await this.appwrite.database.listDocuments<T>(
      environment.collectionMap[type],
      appwriteQueries,
      100,
      results.length,
      undefined,
      undefined,
      ['creationTime'],
      [newestFirst ? 'DESC' : 'ASC']
      );
      results.push(...response.documents)
   }

    return {sum: response.total, documents: results}
  }

  async getFileView(id: string) {
    return this.appwrite.storage.getFileView(environment.STORAGE_BUCKET,id);
  }
  async getFileDownload(id: string) {
    return this.appwrite.storage.getFileDownload(environment.STORAGE_BUCKET,id);
  }
  async getFilePreview(id: string) {
    return this.appwrite.storage.getFilePreview(environment.STORAGE_BUCKET,id);
  }

  async saveFile(file: File) {
    return this.appwrite.storage.createFile(environment.STORAGE_BUCKET,'unique()', file);
  }

  async deleteFile(id: string) {
    return this.appwrite.storage.deleteFile(environment.STORAGE_BUCKET,id);
  }

  async getPreferences(): Promise<Config> {
    const prefs = await this.appwrite.account.getPrefs<Config | {}>();
    if('autoAddAnki' in prefs){
      return prefs as Config;
    }else{
      return DEFAULT_CONFIG;
    }
}

async savePreferences(config: Config): Promise<void> {
  await this.appwrite.account.updatePrefs<Config>(config);
}  

makeBackup(): Promise<any> {
  throw new Error('Method not implemented.');
}

}
