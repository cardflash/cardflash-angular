import { Injectable } from '@angular/core';
import { UserNotifierService } from './services/notifier/user-notifier.service';
import { Config } from './types/config';
import { FailedRequest } from './types/failed-request';
import {nanoid} from 'nanoid';
import { Appwrite } from 'appwrite';
import { environment } from 'src/environments/environment';
import * as localforage from 'localforage'
@Injectable({
  providedIn: 'root'
})
export class DataService {
  
  public offlineMode : boolean = true;
  private appwrite : Appwrite;

  public failedRequests : FailedRequest[] = [];

  public busy: boolean = false;

  public static readonly DEFAULT_CONFIG : Config ={
    drawOnPdf: false,
    selectionOnTop: false,
    autoAddAnki: false,
    deckName : "Default",
    addImageOption: true,
    addTextOption: true,
    addOcrTextOption: false,
    ocrLanguage: "eng",
    addTextAsHidden: true,
    singlePageMode: false,
    autoAddServer: true
  }
  public prefs : any = {config: DataService.DEFAULT_CONFIG};

  public config : Config = DataService.DEFAULT_CONFIG;
  
  constructor(private userNotifierService : UserNotifierService) {
    this.initLocalForage();
    console.log()
    this.appwrite = new Appwrite();
    this.appwrite.setEndpoint(environment.API_ENDPOINT);
    this.appwrite.setProject(environment.API_PROJECT);
    this.appwrite.account.createJWT().then((res: any) => {
      this.appwrite.setJWT(res.jwt);
    });

    this.loadFailedRequests();
    // this.init();
} 

  async init(){
    this.initLocalForage();
    await this.getPrefsFromStorage();
    const res = await this.getFromStorage('offlineMode');
      if(res === "false"){
        this.offlineMode = false;
        const serverPrefs = await this.fetchPrefsFromServer();
        if(!this.prefs['lastUpdated'] || (serverPrefs['lastUpdated'] && this.prefs['lastUpdated'] < serverPrefs['lastUpdated']) ){
          this.prefs = serverPrefs;
          this.savePrefsToStorage(this.prefs);
        }else{
          this.savePrefsToServer(this.prefs);
        }
      }else{
        this.offlineMode = true;
    }
  }

  initLocalForage(){
    localforage.config({
      name: 'flashcards_siter.eu',
      storeName: 'flashcards_siter_eu',
      driver: [ localforage.LOCALSTORAGE, localforage.INDEXEDDB, localforage.WEBSQL]
    });
  }

  saveOfflineModeSetting(){
    this.saveToStorage("offlineMode",this.offlineMode+"");
  }

  async saveToStorage(key: string, value: string) {
    await localforage.setItem(key,value);
  }

  getFromStorage(key: string) {
    return localforage.getItem(key) as Promise<any>;
  }

  async getCollectionFromStorage(key: string): Promise<Map<string,any>>{
    const val = await this.getFromStorage(key);
    // console.log("Got " +key +" locally:",val,JSON.parse(val.value),new Map<string,any>(JSON.parse(val.value)));
    let parsedVal = JSON.parse(val);
    if(!parsedVal || !parsedVal['length']){
      parsedVal = [];
    }
    if(parsedVal.length == 0 || parsedVal[0].length != 2){
      parsedVal = [];
    }else if(!parsedVal[0][1]['localID']){
      parsedVal = [];
    }
    return new Map<string,any>(parsedVal);
  }

  async createDocument(collectionName: string, data: any){
    console.log("Create Document",collectionName,data);
    let success = true;
    if(data['localID'] == null){
      data['localID'] = nanoid();
    }
    if(!this.offlineMode){
      const res = await this.createDocumentOnline(collectionName,data,data['localID']);
      if(res){
        data = res;
      }else{
        success = false;
      }
    }
      const offlineRes = await this.createDocumentOffline(collectionName,data);
      success = success && offlineRes.success;
      return {success: success, result: data};
    }

  async createDocumentOffline(collectionName: string, data: {localID: string}){
    let collection = await this.getCollectionFromStorage(collectionName);
    collection.set(data['localID'],data);
    const success = await this.saveCollectionToStorage(collectionName,collection);
    return {success: success, localID: data['localID']};
  }

  async updateDocument(collectionName: string, data : {ID?: string, localID: string}){
    console.log("Update Document",collectionName,data);
    let success = true;
    let res;
    if(!data.localID){
      success = false;
      return {success: success, localID: data['localID']};
    }else{
      if(!this.offlineMode){
        res = await this.updateDocumentOnline(collectionName,data)
        if(!res){
          success = false;
        }
      }
      success = success && await this.putLocalObject(collectionName,data['localID'],data);
      }
      return {success: success, result: (res || data)};
  }

      public stringify(obj: any){
        return JSON.stringify(obj);
      }

    async createDocumentOnline(collectionName: string, data: any, localID?: string, notifyOnSuccess : boolean = false) : Promise<any | undefined>{
      const apiProm =  this.appwrite.database.createDocument(environment.collectionMap[collectionName],data);
      const apiRes = await this.userNotifierService.notifyForPromiseFlag(apiProm, "(Online) " + collectionName +  " creation",notifyOnSuccess);
      if(localID){
    if(apiRes.success){
        let ID = apiRes.result.$id;
        data['$id'] = ID;
        const collection = await this.getCollectionFromStorage(collectionName);
        collection.set(localID,data);
        await this.saveCollectionToStorage(collectionName,collection);
    
      }else{
        this.failedRequests.push({ID: nanoid(), time: Date.now(),type: 'create', dataLocalID: localID, data: data, collectionName: collectionName});
        this.saveFailedRequests();
      }
      return apiRes.result;
    }else{
      return undefined;
    } 
    
      }

    
      async updateDocumentOnline(collectionName: string, data : {$id?: string, localID?: string}, notifyOnSuccess : boolean = false) : Promise<any>{
        if(data.$id){
          const apiProm =  this.appwrite.database.updateDocument(environment.collectionMap[collectionName],data.$id,data);
          const apiRes = await this.userNotifierService.notifyForPromiseFlag(apiProm, "(Online) " + collectionName +  " Update",notifyOnSuccess);
          if(!apiRes.success){
            this.failedRequests.push({ID: nanoid(), time: Date.now(), type: 'update', dataLocalID: data['localID'] || '', dataID: data['$id'], data: data, collectionName: collectionName});
            this.saveFailedRequests();
            return undefined;
          }else{
            return apiRes.result;
          }
        }else{
          this.userNotifierService.notify("Object "+ data.localID + " does not exist on server.","","danger");
          this.failedRequests.push({ID: nanoid(), time: Date.now(), type: 'update', dataLocalID: data['localID'] || '', dataID: data['$id'], data: data, collectionName: collectionName});
          this.saveFailedRequests();
          return undefined;
        }
      }

      async retryRequest(req: FailedRequest){
        this.removeFailedRequest(req.ID);
        switch (req.type) {
          case 'create':
            const ID = await this.createDocumentOnline(req.collectionName,req.data,req.dataLocalID,true);
            const collection = await this.getCollectionFromStorage(req.collectionName);
            const object = collection.get(req.dataLocalID);
            object.ID = ID;
            this.saveCollectionToStorage(req.collectionName,collection);
            break;
          case 'update':
            console.log(req.data);
            this.updateDocumentOnline(req.collectionName,req.data);
          break;
          default:
            this.userNotifierService.notify("Invalid request type",this.stringify(req),"danger");
            break;
        }
      }


      async getLocalObject(collectionName: string, localID: string){
        const collection = await this.getCollectionFromStorage(collectionName);
        if(!collection){
          return null;
        }else{
          return collection.get(localID);
        }
      }

      async putLocalObject(collectionName: string, localID: string, obj: any){
        const collection = await this.getCollectionFromStorage(collectionName);
        if(!obj){
          return false;
        }else{
          collection.set(localID,obj);
          await this.saveCollectionToStorage(collectionName,collection);
          return true;
        }
      }

      async saveCollectionToStorage(collectionName: string, collection : Map<string,any>){
        const prom =  this.saveToStorage(collectionName,JSON.stringify(Array.from(collection)));
        const res = await this.userNotifierService.notifyOnPromiseReject(prom,"Saving " + collectionName + " to local storage");
        return res.success;
      }


      async saveFailedRequests(){
        await this.saveToStorage('failedRequests',JSON.stringify(this.failedRequests));
      }

      async loadFailedRequests(){
        const obj = await this.getFromStorage('failedRequests');
        if(obj){
          this.failedRequests = JSON.parse(obj);
        }else{
          this.failedRequests = [];
        }
      }
        removeFailedRequest(ID: string) {
          this.failedRequests = this.failedRequests.filter((req)=> req.ID !== ID);
          this.saveFailedRequests();
        }
        clearFailedRequests(){
          this.failedRequests = [];
          this.saveFailedRequests();
        }

  async fetchOnlineCollection(collectionName: string){
        let prom = this.appwrite.database.listDocuments(environment.collectionMap[collectionName],[],100,0);
        const list = await this.userNotifierService.notifyOnPromiseReject(prom,"(Online) Fetching "+collectionName);
        let documents : any[] = [].concat(list.result.documents);
        let offset = list.result.documents.length;
        if(list.success){
        let totalAmount = list.result.sum;
        while(documents.length < totalAmount){
          let prom = this.appwrite.database.listDocuments(environment.collectionMap[collectionName],[],100,offset);
          const res = await this.userNotifierService.notifyOnPromiseReject(prom,"(Online) Fetching "+collectionName);
          if(!res.success){ break; }
          documents = documents.concat(res.result.documents);
          offset += res.result.documents.length;
        }
      }

      // let collection = await this.getCollectionFromStorage(collectionName);
      // collection.clear();
      let serverCollection: Map<string,any> =  new Map<string,any>();
      documents.forEach((doc) => {
        serverCollection.set(doc.$id,doc);
        // collection.set(doc.localID,doc);
      })
      // this.saveCollectionToStorage(collectionName,collection);
        return serverCollection;
    }


  async fetchCollection(collectionName: string){
    console.log("Fetching " + collectionName,this.offlineMode);
    let result;
    if(!this.offlineMode){
      result =  await this.fetchOnlineCollection(collectionName);
    }
    let offlineResult = await this.getCollectionFromStorage(collectionName);
    return result || offlineResult;
  }

  async deleteDocument(collectionName : string, data : {$id?: string, localID: string}){
    console.log("Delete Document",collectionName,data);
    if(!this.offlineMode && data.$id){
      this.deleteDocumentOnline(collectionName,data.$id,data);
    }
    const collection = await this.getCollectionFromStorage(collectionName);
    collection.delete(data.localID);
    this.saveCollectionToStorage(collectionName,collection);
  }

  async deleteDocumentOnline(collectionName : string, $id : string | undefined, data : {localID?: string}){
    if($id){
      const prom = this.appwrite.database.deleteDocument(environment.collectionMap[collectionName],$id);
      const res = await this.userNotifierService.notifyOnPromiseReject(prom,collectionName + " Deletion");
      if(!res.success && data.localID){
        this.failedRequests.push({time: Date.now(), ID: nanoid(), type: "delete", collectionName: collectionName, dataLocalID: data.localID, data: data});
      }
    }
  }

  async sendAllOfflineToServer(){
    this.busy = true;
    for(let collectionName in environment.collectionMap){
      const map = await this.getCollectionFromStorage(collectionName);
      for(let val of map.values()){
        if(!val.$id && val.localID){
          await this.createDocumentOnline(collectionName,val,val.localID);
        }
      }
    }
    this.busy = false;
    this.userNotifierService.notify("Upload successfull!","","success");
  }

  async deleteAllFromLocal(){
    this.busy = true;
    for( let collectionName in environment.collectionMap){
      await this.saveCollectionToStorage(collectionName,new Map<string,any>());
    }
    this.busy = false;
    this.userNotifierService.notify("Deleted local copy","","success");
  }

  async deleteAllFromServer(){
    this.busy = true;
    for(let collectionName in environment.collectionMap){
      await this.deleteCollectionFromServer(collectionName);
    }
    this.busy = false;
    this.userNotifierService.notify("Deleted server copy","","success");
  }
  async deleteCollectionFromServer(collectionName: string){
    if(!this.offlineMode){
      const prom =  this.appwrite.database.listDocuments(environment.collectionMap[collectionName],[],100);
      const res = await this.userNotifierService.notifyOnPromiseReject(prom,"(Online) Deleting "+collectionName);
      if(res.success){
        let documents : any[] = [];
        let offset = 0;
        let prom = this.appwrite.database.listDocuments(environment.collectionMap[collectionName],[],0,0);
        const list = await this.userNotifierService.notifyOnPromiseReject(prom,"(Online) Deleting "+collectionName);
        if(list.success){
        let totalAmount = list.result.sum;
        do {
          let prom = this.appwrite.database.listDocuments(environment.collectionMap[collectionName],[],100,offset);
          const res = await this.userNotifierService.notifyOnPromiseReject(prom,"(Online) Deleting "+collectionName);
          if(!res.success){ break; }

          documents = documents.concat(res.result.documents);
          offset += res.result.documents.length;
        } while (documents.length < totalAmount);

      }

        let collection = await this.getCollectionFromStorage(collectionName);
        // collection.clear();
        
        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i];
          const el = collection.get(doc.localID)
          const prom = this.appwrite.database.deleteDocument(environment.collectionMap[collectionName],doc.$id);
          const res = await this.userNotifierService.notifyOnPromiseReject(prom,"(Online) Deleting "+collectionName);
          if(el){
          el.$id = undefined;
          }
        }
        this.saveCollectionToStorage(collectionName,collection);
      }
    }
  }

  public trackByID(index : number,obj : {localID: string}){
    return obj.localID;
  }

  public async exportToJSON(){
    this.busy = true;
    let dict = {} as any;
    dict['dataVersion'] = environment.dataVersion;
    for(let collectionName in environment.collectionMap){
      dict[collectionName] = (await this.getFromStorage(collectionName));
    }
    this.busy = false;
    return JSON.stringify(dict);
  }

  public async importJSON(json: any){
    this.busy = true;
    for(let collectionName in environment.collectionMap){
      if(json[collectionName]){
        console.log(json[collectionName]);
        const value = JSON.parse(json[collectionName]);
        let collectionInJSON : Map<string,any> = new Map<string,any>(value);
        console.log(collectionInJSON);
        let localCollection : Map<string,any> = await this.getCollectionFromStorage(collectionName);
        for(const key of collectionInJSON.keys()){
          localCollection.set(key,collectionInJSON.get(key));
        }
        this.saveCollectionToStorage(collectionName,localCollection);
      }
    }
    this.busy = false;
  }


  async fetchPrefsFromServer(){
    const prom =  this.appwrite.account.getPrefs();
    const res = await this.userNotifierService.notifyOnPromiseReject(prom,"(Online) Fetching preferences");
    if(res.success){
      return res.result;
    }else{
      return {};
    }
  }

  async savePrefsToServer(prefs: any){
    const prom =  this.appwrite.account.updatePrefs(prefs);
    const res = await this.userNotifierService.notifyOnPromiseReject(prom,"(Online) Saving preferences");
    if(res.success){
      // this.prefs = res.result;
    }
  }

  async savePrefsToStorage(prefs: any){
    await this.saveToStorage("prefs",JSON.stringify(prefs));
  }

  async savePrefs(prefs: any){
    for(const key in prefs){
      this.prefs[key] = prefs[key];
    }
    this.prefs['lastUpdated'] = Date.now();
    
    await this.savePrefsToStorage(this.prefs);
    if(!this.offlineMode){
      this.savePrefsToServer(this.prefs);
    }
  }

  async getPrefsFromStorage(){
    this.prefs = JSON.parse((await this.getFromStorage("prefs")));
    if(!this.prefs || !this.prefs['config']){
      this.prefs = {config: DataService.DEFAULT_CONFIG};
    }
  }

  async saveImage(img: File) : Promise<string>{
    const prom = this.appwrite.storage.createFile(img);
    const res = await this.userNotifierService.notifyOnPromiseReject(prom,"Uploading Image");
    if(res.success){
      return res.result.$id;
    }else{
      return "";
    }
  }
  async uploadFile(file: File): Promise<string>{
    const prom = this.appwrite.storage.createFile(file);
    const res = await this.userNotifierService.notifyOnPromiseReject(prom,"Uploading File");
    if(res.success){
      return res.result.$id;
    }else{
      return "";
    }
  }

  getFileView(fileid: string){
    return this.appwrite.storage.getFileView(fileid);
  }
  getFilePreview(filedid: string){
    return this.appwrite.storage.getFilePreview(filedid,100,100);
  }

  getFile(fileid: string){
    return this.appwrite.storage.getFileDownload(fileid);
  }

  async deleteFile(id: string){
    const prom = this.appwrite.storage.deleteFile(id);
    const res = await this.userNotifierService.notifyOnPromiseReject(prom,"Deleting File");
    return res.success;
  }


  async getOnlineDocument(collectionName: string, $id: string){
    const prom = this.appwrite.database.getDocument(environment.collectionMap[collectionName],$id);
    const res = await this.userNotifierService.notifyOnPromiseReject(prom,"Retrieving by id for "+collectionName);
    return res.result;
  }

  getHeaders(){
    return this.appwrite.headers;
  }

  getFlagURL(code: string) : URL{
    return this.appwrite.avatars.getFlag(code,20,20);
  }


}
