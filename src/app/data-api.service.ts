import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { AppwriteProvider } from './data-api-providers/appwrite-provider';
import { LocalProvider } from './data-api-providers/local-provider';
import { Annotation } from './types/annotation';
import {
  Config,
  DataApiProvider,
  DEFAULT_CONFIG,
  Entry,
  ENTRY_TYPES,
} from './types/data-api-provider';
import { UserNotifierService } from './services/notifier/user-notifier.service';

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
  $id?: string;
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

  private fileViewURLCache: Map<string, URL | Promise<URL>> = new Map<string, URL | Promise<URL>>();
  constructor(public notifierService: UserNotifierService) {
    try {
      const provider_setting = window.localStorage.getItem('cardflash_provider');
      if (provider_setting !== null && provider_setting === 'appwrite') {
        this.apiProvider = new AppwriteProvider();
      } else if (provider_setting !== null && provider_setting === 'local') {
        this.apiProvider = new LocalProvider();
      } else {
        // Default
        window.localStorage.setItem('cardflash_provider', 'local');
        this.apiProvider = new LocalProvider();
      }
    } catch (error) {
      console.log('localStorage failed');
      // localStorage fails to work, this properly means that the localProvider will also not work
      // we should instead use the appwrite backend
      this.apiProvider = new AppwriteProvider();
    }
  }

  async fetchConfig() {
    this.config = { ...DEFAULT_CONFIG, ...(await this.apiProvider.getPreferences()) };
  }

  async saveConfig() {
    console.log('saving config', this.config);
    await this.apiProvider.savePreferences(this.config);
  }

  setProvider(type: 'appwrite' | 'local') {
    try {
      window.localStorage.setItem('cardflash_provider', type);
    } catch (e) {
      console.log('could not store provider settings in localStorage', e);
    }
    if (type === 'appwrite') {
      this.apiProvider = new AppwriteProvider();
    } else {
      this.apiProvider = new LocalProvider();
    }
  }

  getProvider(): 'local' | 'appwrite' {
    if (this.apiProvider instanceof AppwriteProvider) {
      return 'appwrite';
    } else {
      return 'local';
    }
  }

  getProviderInstance(): DataApiProvider {
    return this.apiProvider;
  }

  isOfflineMode(): boolean {
    return this.apiProvider instanceof LocalProvider;
  }

  setOfflineMode(toOffline: boolean) {
    this.setProvider(toOffline ? 'local' : 'appwrite');
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
    return await this.regenerateImageObjectURLs(
      await this.apiProvider.getEntry<CardEntry>(ENTRY_TYPES.CARDS, id)
    );
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
        imgsToRemove.push(
          this.updateDocument(doc.$id, { cardIDs: cardIDs.filter((c) => c !== id) })
        );
      });
      Promise.all(imgsToRemove)
        .then(() => {
          this.apiProvider
            .deleteEntry(ENTRY_TYPES.CARDS, id)
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
      if (doc.annotationsJSON) {
        for (let i = 0; i < doc.annotationsJSON.length; i++) {
          const annotation: Annotation = JSON.parse(doc.annotationsJSON[i]);
          if (annotation.imgID !== undefined) {
            additionalPromises.push(this.deleteFile(annotation.imgID));
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
          this.apiProvider
            .deleteEntry(ENTRY_TYPES.DOCUMENTS, id)
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
    return (
      await this.apiProvider.listEntries<DocumentEntry>(
        ENTRY_TYPES.DOCUMENTS,
        undefined,
        newestFirst
      )
    ).documents;
  }
  async listDocumentsForCard(cardID: string) {
    return (
      await this.apiProvider.listEntries<DocumentEntry>(
        ENTRY_TYPES.DOCUMENTS,
        [{ type: 'search', attribute: 'cardIDs', values: [cardID] }],
        undefined
      )
    ).documents;
  }
  async listCards(newestFirst: boolean, limit: undefined | number = undefined) {
    return await Promise.all(
      (
        await this.apiProvider.listEntries<CardEntry>(ENTRY_TYPES.CARDS, undefined, newestFirst)
      ).documents
        .slice(0, limit ?? Number.MAX_VALUE)
        .map((c) => this.regenerateImageObjectURLs(c))
    );
  }

  async createDocument(data: DocumentEntryContent) {
    return await this.apiProvider.createEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS, data);
  }

  async createCard(data: CardEntryContent) {
    return await this.apiProvider.createEntry<CardEntry>(ENTRY_TYPES.CARDS, data);
  }

  async getFileView(id: string) {
    if (this.fileViewURLCache.has(id)) {
      return await this.fileViewURLCache.get(id)!;
    } else {
      const urlProm = this.apiProvider.getFileView(id);
      this.fileViewURLCache.set(id, urlProm);
      const url = await urlProm;
      this.fileViewURLCache.set(id, url);
      return url;
    }
  }
  getFilePreview(id: string) {
    return this.apiProvider.getFilePreview(id);
  }

  async saveFile(file: File) {
    const res = await this.apiProvider.saveFile(file);
    console.log('saving file', res);
    return res;
  }

  deleteFile(id: string) {
    return this.apiProvider.deleteFile(id);
  }

  async regenerateImageObjectURLs(card: CardEntry): Promise<CardEntry> {
    const domParser = new DOMParser();
    const docFront = domParser.parseFromString(card.front, 'text/html');
    const docBack = domParser.parseFromString(card.back, 'text/html');
    const imgSavePromises: Promise<void>[] = [];
    for (const side of [docFront, docBack]) {
      let imgs = side.querySelectorAll<HTMLImageElement>('img[data-imageid]');
      for (let i = 0; i < imgs.length; i++) {
        const node = imgs[i];
        const imageId = node.getAttribute('data-imageid');
        if (imageId !== null) {
          imgSavePromises.push(
            new Promise<void>(async (resolve, reject) => {
              try {
                node.src = (await this.getFileView(imageId)).href;
                resolve();
              } catch (e) {
                reject(e);
              }
            })
          );
        }
      }
    }
    await Promise.all(imgSavePromises);
    card.front = docFront.documentElement.outerHTML;
    card.back = docBack.documentElement.outerHTML;
    return card;
  }

  async downloadBackup() {
    // const cards = await this.listCards(true);
    // for (let i = 0; i < cards.length; i++) {
    //   const card = cards[i];
    //   await this.cardToMarkdown(card);
    // }
  }

  async downloadCards() {
    const cards = await this.listCards(true);
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
    }
    const docs = await this.listDocuments(true);
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      this.apiProvider.getFileDownload(doc.fileid).then((res) => {
        const tmp = document.createElement('a');
        tmp.href = res.href;
        const filename = doc.name + doc.fileid + '.pdf';
        tmp.download = filename;
        document.body.appendChild(tmp);
        tmp.click();
        document.body.removeChild(tmp);
      });
    }
  }

  async saveOnlineDataLocally() {
    const prevProvider = this.getProvider();
    try {
      this.notifierService.notify(
        'Attemping to Save Data',
        'This might take a while. Do not press anything and wait for a success/error message to appear.',
        'success',
        false,
        true
      );
      this.setProvider('appwrite');
      const cards = await this.listCards(true);
      const documents = await this.listDocuments(true);
      const appwriteProviderInstance = this.getProviderInstance();
      this.setProvider('local');
      const localProvider = this.getProviderInstance();
      const domParser = new DOMParser();

      function saveImages(doc: Document) {
        const imgPromises: Promise<any>[] = [];
        doc.querySelectorAll('img').forEach((img) => {
          imgPromises.push(
            new Promise<void>((resolve, reject) => {
              fetch(img.src, { credentials: 'include' })
                .then(async (res) => {
                  const file = await res.blob();
                  const savedFile = await localProvider.saveFile(
                    new File([file], img.dataset.imageid || img.src, { type: file.type })
                  );
                  img.dataset.imageid = savedFile.$id;
                  img.src = '';
                })
                .finally(() => resolve());
            })
          );
        });
        return Promise.all(imgPromises);
      }

      function replaceLinks(doc: Document) {
        doc.querySelectorAll('a').forEach((a) => {
          const reg =
            /(http:\/\/localhost:4200\/|https:\/\/app.cardflash.net\/|https:\/\/cardflash.net\/)doc\/(.*)#(.*)/;
          const res = reg.exec(a.href);
          if (res && res.length >= 4) {
            const oldDocID = res[2];
            a.href = a.href.replace(oldDocID, documentIDMap[oldDocID] ?? oldDocID);
          }
        });
      }

      // Map of online IDs => new offline IDs
      const documentIDMap: Record<string, string> = {};
      for (const doc of documents) {
        const url = await appwriteProviderInstance.getFileDownload(doc.fileid);
        const file = await (await fetch(url.href, { credentials: 'include' })).blob();
        if (file.type !== 'application/pdf') {
          throw new Error('Got file of unexpected type ' + file.type + ' for ' + url);
        }
        const savedFile = await this.apiProvider.saveFile(
          new File([file], doc.name, { type: file.type })
        );
        const newDoc = await this.createDocument({
          ...doc,
          fileid: savedFile.$id,
          cardIDs: doc.cardIDs,
        });
        documentIDMap[doc.$id] = newDoc.$id;
      }

      // Map of online IDs => new offline IDs
      const cardIDMap: Record<string, string> = {};
      for (const card of cards) {
        const docFront = domParser.parseFromString(card.front, 'text/html');
        replaceLinks(docFront);
        await saveImages(docFront);
        const docBack = domParser.parseFromString(card.back, 'text/html');
        replaceLinks(docBack);
        await saveImages(docBack);
        const updatedCard: CardEntry = {
          ...card,
          front: docFront.documentElement.outerHTML,
          back: docBack.documentElement.outerHTML,
        };
        const createdCard = await this.createCard(updatedCard);
        cardIDMap[card.$id] = createdCard.$id;
      }

      // Update card IDs for new document
      for (const doc of documents) {
        await this.updateDocument(documentIDMap[doc.$id], {
          cardIDs: doc.cardIDs?.map((cid) => cardIDMap[cid]),
        });
      }
    } catch (e: any) {
      this.setProvider(prevProvider);
      this.notifierService.notify('Error Saving Data', e.toString(), 'danger', false);
      return;
    }
    this.notifierService.notify(
      'Finished Saving Data: Success!',
      'Finished saving online data locally! Reload the page to view the results. Make sure to check if everything was saved correctly.',
      'success',
      false
    );
    this.setProvider('local');
  }

  async cardToMarkdown(
    card: CardEntry | CardEntryContent,
    mdOptions: {
      embedImages?: boolean;
      markdownFlavor?: 'default' | 'mkdocs' | 'obsidian' | 'html';
    } = {
      embedImages: false,
      markdownFlavor: 'mkdocs',
    }
  ) {
    const content = card.front + '<br><hr><br>' + card.back;
    const domParser = new DOMParser();

    const doc = domParser.parseFromString(content, 'text/html');
    const imgPromises: Promise<any>[] = [];
    doc.querySelectorAll('img').forEach((img) => {
      if (mdOptions.embedImages) {
        imgPromises.push(
          new Promise<void>((resolve, reject) => {
            fetch(img.src, { credentials: 'include' })
              .then(async (res) => {
                const blob = await res.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                  reader.onload = resolve;
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                img.src =
                  reader.result
                    ?.toString()
                    .replace('data:application/octet-stream;', `data:image/png;`) || img.src;
              })
              .finally(() => resolve());
          })
        );
      } else {
        imgPromises.push(
          new Promise<void>(async (resolve, reject) => {
            fetch(img.src, { credentials: 'include' })
              .then(async (res) => {
                const blob = await res.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                  reader.onload = resolve;
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                const tmp = document.createElement('a');
                tmp.style.display = 'none';

                tmp.href =
                  reader.result
                    ?.toString()
                    .replace('data:application/octet-stream;', `data:image/png;`) || img.src;
                const filename = `${
                  img.getAttribute('data-imageid') || new Date().toISOString()
                }.png`;
                tmp.download = filename;
                tmp.target = '_blank';
                document.body.appendChild(tmp);
                tmp.click();
                document.body.removeChild(tmp);
                img.src = filename;
              })
              .finally(() => resolve());
          })
        );
      }
    });

    await Promise.all(imgPromises);

    const cleanContent = DOMPurify.sanitize(doc.body.outerHTML, {
      // ADD_DATA_URI_TAGS: ['img', 'a'],
      ALLOW_UNKNOWN_PROTOCOLS: true,
    });

    let res: string = '';
    if (mdOptions.markdownFlavor && mdOptions.markdownFlavor === 'html') {
      res = cleanContent;
    } else {
      const turndownService = new TurndownService({
        hr: '---------',
        codeBlockStyle: 'indented',
        bulletListMarker: '-',
        headingStyle: 'atx',
      });
      turndownService.keep(['img']);

      turndownService.addRule('highlighter', {
        filter(node, options) {
          return node.tagName === 'MARK';
        },
        replacement(content, node, options) {
          if ((node as HTMLElement).classList.length > 0) {
            const color = (node as HTMLElement).classList[0];
            return `<mark style="background-color: ${color
              .replace('marker-', '')
              .replace('-', '')}">${content}</mark>`;
          } else {
            return `==${content}==`;
          }
        },
      });

      turndownService.addRule('math', {
        filter(node, options) {
          return node.classList.contains('math-tex');
        },
        replacement(content, node, options) {
          let str = node.textContent || '';
          return str
            .replace('\\(', '$')
            .replace('\\)', '$')
            .replace('\\[', '\n$$$')
            .replace('\\]', '$$$\n');
        },
      });

      turndownService.remove((node, options) => node.classList.contains('admonition-title'));

      turndownService.addRule('admonition', {
        filter(node, options) {
          return node.classList.contains('admonition');
        },
        replacement(content, node, options) {
          console.log({ node });
          let type = 'note';
          (node as any).classList.forEach((className: string) => {
            if (
              className !== 'admonition' &&
              className !== 'ck-widget' &&
              className !== 'default'
            ) {
              type = className;
            }
          });
          //  Obsidian native syntax (from obsidian v0.14.0)
          if (mdOptions.markdownFlavor && mdOptions.markdownFlavor === 'obsidian') {
            return `>[!${type.toUpperCase()}] ${
              node.querySelector('.admonition-title')?.textContent || ''
            }
${content
  .split('\n')
  .map((s) => '>' + s)
  .join('\n')}\n`;
            // Admonition obsidian plugin syntax:
            //         return `\`\`\`ad-${type}
            // title: ${node.querySelector('.admonition-title')?.textContent || ''}
            // ${content.split('\n').map(s => " "+s).join('\n')}
            // \`\`\``
          } else {
            return `!!! ${type} "${node.querySelector('.admonition-title')?.textContent || ''}"
${content
  .split('\n')
  .map((s) => '    ' + s)
  .join('\n')}\n`;
          }
        },
      });

      res = turndownService.turndown(cleanContent);
    }
    // navigator.clipboard.writeText(md);
    const type = mdOptions.markdownFlavor === 'html' ? 'html' : 'md';
    const blob = new Blob([res], { type: `text/${type}` });
    const blobURL = window.URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.style.display = 'none';
    tempLink.href = blobURL;
    tempLink.download = `${card.title}-${new Date().toISOString()}.${type}`;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    console.log({ res });
  }
}
