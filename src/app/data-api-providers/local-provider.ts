import { Config, DataApiProvider, DEFAULT_CONFIG, Entry, EntryList, EntryWithCreationTime, FileEntry, QueryOption } from "../types/data-api-provider";
import {v4 as uuidv4} from 'uuid'
import localforage from "localforage";
import { DocumentEntry } from "../data-api.service";
export class LocalProvider implements DataApiProvider{

    constructor(){
        localforage.config({driver: [localforage.INDEXEDDB,localforage.WEBSQL,localforage.LOCALSTORAGE], name: 'local_cardflash', storeName: 'local_cardflash'})
        // localforage.setDriver(localforage.INDEXEDDB).catch((e) => {console.log({e},'driver fail')})
     }

    async createEntry<T extends Entry>(type: string, data: object, read?: string[], write?: string[]): Promise<T> {
        const id = uuidv4();
        const toSave : T = {...data, $id: id, $collection: type, $read: (read || []), $write: (write || [])}  as T;
        const newIds = [...await this.getCollectionArray(type),id]
        const savedIds = await this.setCollectionArray(type,newIds);
        const res = await localforage.setItem<T>(type+'_'+id,toSave);
        return res;
    }
    getEntry<T extends Entry>(type: string, id: string): Promise<T> {
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
                resolve(val)
            }).catch((reason) => {
                console.log({reason});
                reject(reason)
            })
        })
    }

    async listEntries<T extends EntryWithCreationTime>(type: string, queries: QueryOption[] | undefined, newestFirst: boolean | undefined): Promise<EntryList<T>> {
       const ids = await this.getCollectionArray(type)
       const itemPromises : Promise<T>[] = [];
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
        return new Promise<URL>(async (resolve,reject) => {
            try{

                const entry : FileEntry = await this.getEntry<Entry & FileEntry>('file',id)
                const arrayBuffer = await localforage.getItem<ArrayBuffer>('file-'+id);
                if(arrayBuffer === null){
                    reject('File not found locally')
                }else{
                    const file = new File([arrayBuffer],entry.name,{lastModified: entry.dateCreated, type: entry.mimeType})
                    resolve(new URL(URL.createObjectURL(file)));
                }
            }catch(e){
                console.log(e,id);
                reject(e);
            }
          });
    }

    getFilePreview(id: string): Promise<URL> {
        return this.getFileView(id);
    }
    getFileDownload(id: string): Promise<URL> {
        return this.getFileView(id);
    }
    async saveFile(file: File): Promise<FileEntry> {
        let fileEntry : FileEntry = {$id: '', name: file.name, mimeType: file.type, dateCreated: Date.now()}
        const savedEntry = await this.createEntry('file',fileEntry)
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
    console.log("Loaded local config",{prefs})
    if(prefs !== null){
        const parsedConfig = JSON.parse(prefs);
        if(parsedConfig && parsedConfig['config']){
         return parsedConfig['config']
        }
    }
    return DEFAULT_CONFIG;
    }


    async savePreferences(config: Config): Promise<void> {
        const prefs = await localforage.setItem<string>("cardflash_prefs",JSON.stringify({config: config}));
      }

      async makeBackup(): Promise<any> {
        const types = ['documents','cards','file'];
        console.log('make Backup');
        const len = await localforage.length()
        const keys = await localforage.keys();
        let backup: any = {};
        types.forEach((type)=> {backup[type] = []})
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            types.forEach(async (type) => {
                if(key.indexOf(type+"_") === 0 && key !== `${type}_collection`){
                    backup[type].push(await localforage.getItem(key));
                }else if(key.indexOf('file-') === 0){
                    const id = key.substring('file-'.length);
                    const entry : FileEntry  = await this.getEntry<Entry & FileEntry>('file',id);
                    const fileContent : ArrayBuffer | null = await localforage.getItem(key);
                    if(fileContent){
                        const blob = new Blob([fileContent],{type: entry.mimeType})
                        const blobURL = window.URL.createObjectURL(blob);
                        const tempLink = document.createElement('a');
                        tempLink.style.display = 'none';
                        tempLink.href = blobURL;
                        tempLink.target = '_blank';
                        const splitFilename = entry.name.split('.')
                        tempLink.download = `${id}.${splitFilename[splitFilename.length-1]}`
                        document.body.appendChild(tempLink);
                        tempLink.click();
                        document.body.removeChild(tempLink);
                    }
                }
            })
            
        }
        await localforage.iterate((val,key,num) => {
           
        })

        const blob = new Blob([JSON.stringify(backup)],{type: 'text/json'});
        const blobURL = window.URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.style.display = 'none';
        tempLink.href = blobURL;
        tempLink.target = '_blank';
        tempLink.download = `cardflash_backup-${new Date().toISOString()}.json`
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        console.log({backup})
      }
}