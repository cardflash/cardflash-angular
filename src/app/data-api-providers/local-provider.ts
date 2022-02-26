import { Config, DataApiProvider, DEFAULT_CONFIG, Entry, EntryList, EntryWithCreationTime, FileEntry, QueryOption } from "../types/data-api-provider";
import {v4 as uuidv4} from 'uuid'
import localforage from "localforage";
export class LocalProvider implements DataApiProvider{

    constructor(){
        localforage.config({driver: [localforage.INDEXEDDB,localforage.WEBSQL,localforage.LOCALSTORAGE], name: 'local_cardflash', storeName: 'local_cardflash'})
        // localforage.setDriver(localforage.INDEXEDDB).catch((e) => {console.log({e},'driver fail')})
     }

    async createEntry<T extends Entry>(type: string, data: object, read?: string[], write?: string[]): Promise<T> {
        const id = uuidv4();
        console.log({id})
        const toSave : T = {...data, $id: id, $collection: type, $read: (read || []), $write: (write || [])}  as T;
        console.log({toSave})
        const newIds = [...await this.getCollectionArray(type),id]
        console.log({newIds})
        console.log('before setitem')
        const savedIds = await this.setCollectionArray(type,newIds);
        console.log({savedIds})
        const res = await localforage.setItem<T>(type+'_'+id,toSave);
        console.log({res})
        return res;
    }
    getEntry<T extends Entry>(type: string, id: string): Promise<T> {
        console.log('getEntry',{type,id})
        return new Promise<T>((resolve,reject) => {
            localforage.getItem<T>(type+'_'+id).then((value) => {
                if(value !== null){
                    resolve(value);
                }else{
                    reject();
                }
            }).catch((reason) => reject(reason))
        })
    }
    async updateEntry<T extends Entry>(type: string, id: string, data: any): Promise<T> {
        const originalObj : T = await this.getEntry<T>(type,id)
        const obj = Object.assign(originalObj, data);
        return localforage.setItem<T>(type+'_'+id,obj);
    }
    deleteEntry(type: string, id: string): Promise<{}> {
        return new Promise<{}>(async (resolve,reject) => {
            const newIds = (await this.getCollectionArray(type)).filter((el) => el !== id)
            await this.setCollectionArray(type,newIds);
            localforage.removeItem(type + '_' + id).then(() => resolve({})).catch((reason) => reject(reason));
        })
    }

    private getCollectionArray(type: string) : Promise<string[]>{
        return new Promise<string[]>((resolve,reject) => {
            localforage.getItem<string[]>(type+'_collection').then((res) => {
                resolve(res || []);
            }).catch((reason) => reject(reason))
        })
    }

    private setCollectionArray(type: string, value: string[]) : Promise<string[]>{
        return new Promise<string[]>((resolve,reject) => {
            localforage.setItem(type+'_collection',value).then((val) => {
                console.log({val});
                resolve(val)
            }).catch((reason) => {
                console.log({reason});
                reject(reason)
            })
        })
    }

    async listEntries<T extends EntryWithCreationTime>(type: string, queries: QueryOption[] | undefined, newestFirst: boolean | undefined): Promise<EntryList<T>> {
        console.log('listEntries',{type})
       const ids = await this.getCollectionArray(type)
       const itemPromises : Promise<T>[] = []
       console.log('listEntries',{ids})
       for (let i = 0; i < ids.length; i++) {
            itemPromises.push(this.getEntry(type,ids[i]))
       }
       const all = await Promise.all(itemPromises);
       let timeSorted = all.sort((a,b) => b.creationTime - a.creationTime)
       if(queries !== undefined){
        for (let i = 0; i < queries.length; i++) {
            const q = queries[i];
            switch (q.type) {
                case 'search':
                    timeSorted = timeSorted.filter((a : any) => {
                        for(const value of q.values){
                            if(a[q.attribute] && (a[q.attribute] as string).indexOf(value) > -1){
                                return true;
                            }
                        }
                        return false;
                    })
                    break;
                case '=':
                    timeSorted = timeSorted.filter((a : any) => {
                    for(const value of q.values){
                        if(a[q.attribute] === value){
                            return true;
                        }
                    }
                    return false;
                })
                break;
                default:
                    break;
            }
        }
       }
       if (newestFirst !== undefined && newestFirst === false){
        timeSorted = timeSorted.reverse();
       }
       console.log('listEntries finished',{timeSorted})
       return {sum: timeSorted.length, documents: timeSorted}
    }
    async getFileView(id: string): Promise<URL> {
        console.log('getFileView',{id})
        return new Promise<URL>(async (resolve,reject) => {
            const entry : FileEntry = await this.getEntry<Entry & FileEntry>('file',id)
            const arrayBuffer = await localforage.getItem<ArrayBuffer>('file-'+id);
            console.log('file',{arrayBuffer})
            if(arrayBuffer === null){
                reject('File not found locally')
            }else{
                const file = new File([arrayBuffer],entry.name,{lastModified: entry.dateCreated, type: entry.mimeType})
                resolve(new URL(URL.createObjectURL(file)));
                // const reader = new FileReader();
                // reader.onloadend = () => {
                //   const res =reader.result;
                //   if(res && !(res instanceof ArrayBuffer)){
                //       resolve(new URL(res))
                //   }
                // };
                // reader.readAsDataURL(file);
            }
          });
    }

    getFilePreview(id: string): Promise<URL> {
        return this.getFileView(id);
    }
    async saveFile(file: File): Promise<FileEntry> {
        let fileEntry : FileEntry = {$id: '', name: file.name, mimeType: file.type, dateCreated: Date.now()}
        console.log("SAVE FILE",{fileEntry})
        const savedEntry = await this.createEntry('file',fileEntry)
        console.log({savedEntry})
        fileEntry.$id = savedEntry.$id;
        await localforage.setItem('file-'+fileEntry.$id,await file.arrayBuffer())
        return fileEntry;
    }
    async deleteFile(id: string): Promise<{}> {
        await localforage.removeItem('file-'+id)
        await this.deleteEntry('file',id)
        return {};
    }

    async getPreferences(): Promise<Config> {
    const prefs = await localforage.getItem<string>("cardflash_prefs");
    if(prefs !== null){
        const parsedConfig = JSON.parse(prefs);
        if(!parsedConfig|| parsedConfig['config']){
         return parsedConfig
        }
    }
    return DEFAULT_CONFIG;
    }


    async savePreferences(config: Config): Promise<void> {
        const prefs = await localforage.setItem<string>("cardflash_prefs",JSON.stringify(config));
      }
}