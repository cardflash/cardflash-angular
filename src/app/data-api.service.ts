import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { AppwriteProvider } from './data-api-providers/appwrite-provider';
import { LocalProvider } from './data-api-providers/local-provider';
import { Annotation } from './types/annotation';
import * as MarkdownIt from 'markdown-it'
var MarkdownItMark = require('markdown-it-mark');
// var { MarkDownItTable } = require('markdown-it-table');

var MarkDownItTaskLists = require('markdown-it-task-lists');
var { markdownItTable  } = require('markdown-it-table');
var MarkDownItContainer = require('markdown-it-container');
var MarkDownItKatex = require('../markdown-it-math/index');
import * as MarkDownWikiLinks from '../markdown-it-wikilinks/index';
// import * as MarkDownItContainer from ';
import {
  Config,
  DataApiProvider,
  DEFAULT_CONFIG,
  Entry,
  ENTRY_TYPES,
} from './types/data-api-provider';
import { html } from 'd3';
import { environment } from 'src/environments/environment';

export interface DocumentEntryContent {
  name: string;
  fileid: string;
  creationTime: number;
  currentPage: number;
  tags?: string[];
  annotationsJSON?: string[];
  cardIDs?: string[];
  noteIDs?: string[];
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

export interface NoteEntryContent {
  $id?: string;
  content: string;
  title: string;
  creationTime: number;
  // imgIDs?: string[];
}

export type DocumentEntry = Entry & DocumentEntryContent;
export type CardEntry = Entry & CardEntryContent;
export type NoteEntry = Entry & NoteEntryContent;

@Injectable({
  providedIn: 'root',
})
export class DataApiService {
  private apiProvider: DataApiProvider;
  public config: Config = DEFAULT_CONFIG;
  
  private fileViewURLCache: Map<string, URL | Promise<URL>> = new Map<string, URL | Promise<URL>>();

  private mdIt?: MarkdownIt

  constructor() {
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
    this.initMDIt();
  }

  async fetchConfig() {
    this.config = await this.apiProvider.getPreferences();
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

  async updateNote(id: string, data: any) {
    return await this.apiProvider.updateEntry<NoteEntry>(ENTRY_TYPES.NOTES, id, data);
  }

  async getNote(id: string) {
    return await this.regenerateImageObjectURLsForNote(
      await this.apiProvider.getEntry<NoteEntry>(ENTRY_TYPES.NOTES, id)
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

  deleteNote(id: string){
    return this.apiProvider.deleteEntry(ENTRY_TYPES.NOTES,id);
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

  async listCards(newestFirst: boolean) {
    return await Promise.all(
      (
        await this.apiProvider.listEntries<CardEntry>(ENTRY_TYPES.CARDS, undefined, newestFirst)
      ).documents.map((c) => this.regenerateImageObjectURLs(c))
    );
  }

  async listNotes(newestFirst: boolean) {
    return await Promise.all(
      (
        await this.apiProvider.listEntries<NoteEntry>(ENTRY_TYPES.NOTES, undefined, newestFirst)
      ).documents.map((c) => this.regenerateImageObjectURLsForNote(c))
    );
  }

  async createDocument(data: DocumentEntryContent) {
    return await this.apiProvider.createEntry<DocumentEntry>(ENTRY_TYPES.DOCUMENTS, data);
  }

  async createCard(data: CardEntryContent) {
    return await this.apiProvider.createEntry<CardEntry>(ENTRY_TYPES.CARDS, data);
  }

  async createNote(data: NoteEntryContent) {
    return await this.apiProvider.createEntry<NoteEntry>(ENTRY_TYPES.NOTES, data);
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

  async regenerateImageObjectURLsForNote(note: NoteEntry): Promise<NoteEntry>{
    const domParser = new DOMParser();
    const dom = domParser.parseFromString(note.content, 'text/html');
    const imgSavePromises: Promise<void>[] = [];
      let imgs = dom.querySelectorAll<HTMLImageElement>('img[data-imageid]');
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
    
    await Promise.all(imgSavePromises);
    note.content = dom.documentElement.innerHTML;
    return note;
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
      await this.cardToMarkdown(card);
    }
    const docs = await this.listDocuments(true);
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      // export doc
      // probably as file (pdf) + json
      // ideally: embed annotations
    }
  }


  async noteToMarkdown(note: NoteEntry,  mdOptions: { embedImages?: boolean; markdownFlavor?: 'default' | 'mkdocs' | 'obsidian' | 'html' } = {
    embedImages: false,
    markdownFlavor: 'obsidian',
  }){
    const domParser = new DOMParser();

    const doc = domParser.parseFromString(note.content, 'text/html');
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
      
                    tmp.href = reader.result
                    ?.toString()
                    .replace('data:application/octet-stream;', `data:image/png;`) || img.src;
                    const filename = `${
                      img.getAttribute('data-imageid') || Date.now()
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

    let res : string = '';
    if(mdOptions.markdownFlavor && mdOptions.markdownFlavor === 'html'){
    const turndownService = new TurndownService({
      hr: '---------',
      codeBlockStyle: 'indented',
      bulletListMarker: '-',
      headingStyle: 'atx'
    });
    turndownService.keep(['img']);

    turndownService.addRule('highlighter', {
      filter(node, options) {
        return node.tagName === 'MARK';
      },
      replacement(content, node, options) {
        // if((node as HTMLElement).classList.length > 0){
        //   const color = (node as HTMLElement).classList[0];
        //   return `<mark style="background-color: ${color.replace('marker-','').replace('-','')}">${content}</mark>`;
        // }else{
          return `==${content}==`
        // }
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

    // turndownService.remove((node, options) => node.classList.contains('admonition-title'));

    turndownService.addRule('wiki-link',{
      filter(node, options) {
        return node.tagName === 'A' && node.classList.contains('mention');
      },
      replacement(content, node, options) {
        console.log({node,content})
        return node.textContent || '';
      }
    })
    turndownService.addRule('admonition', {
      filter(node, options) {
        return node.classList.contains('admonition');
      },
      replacement(content, node, options) {
        console.log({ node });
        let type = 'note';
        (node as any).classList.forEach((className: string) => {
          if (className !== 'admonition' && className !== 'ck-widget' && className !== 'default') {
            type = className;
          }
        });
        //  Obsidian native syntax (from obsidian v0.14.0)
        if (mdOptions.markdownFlavor && mdOptions.markdownFlavor === 'obsidian') {
//           return `>[!${type.toUpperCase()}] ${
//             node.querySelector('.admonition-title')?.textContent || ''
//           }
// ${content
//   .split('\n')
//   .map((s) => '>' + s)
//   .join('\n')}\n`;
          // Admonition obsidian plugin syntax:
                  return `\`\`\`ad-${type}
  title: ${node.querySelector('.admonition-title')?.textContent || ''}
          ${content.split('\n').map(s => " "+s).join('\n')}
\`\`\``
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
    tempLink.download = `${note.title}-${note.$id}.${type}`;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    console.log({ res });
  }

  async initMDIt(){
    // if(!this.mdIt){
      const notes = await this.listNotes(true);
      this.mdIt = new MarkdownIt()
        .use(MarkdownItMark)
        .use(markdownItTable)
        .use(MarkDownItTaskLists)
        .use(MarkDownItKatex)
        .use(MarkDownWikiLinks.default, (content, isEmbedding, env) => {
          const note = notes.find((val) => val.title === content);
          console.log({notes,note});
          if(note){
            return {
                // 'onclick': function(e){console.log(e);},
                "href": environment.BASE_URL + '/notes/' + note.$id,
                "class": "mention",
                "data-mention": `[[${note.$id}]]`,
                "text": `[[${note.title}]]`,

                // src: isEmbedding ? ((browser && (window as any).md_availableFiles) || availableFiles).find((file) => file.name === content)?.view : null
            };
          }else{
            return {
              "href":  environment.BASE_URL + '/notes',
              "class": "mention",
              "data-mention": `[[`,
              "text": `[[${content}]]`,
            }
          }
      })
        .use(MarkDownItContainer,'ad-', {
        marker: '`',
  
        validate: function (params: string) {
            return params.trim().match(/\+?( ?)ad-(?<type>\w+)/gs);
        },
  
        render: function (
            tokens: {
                info: string;
                nesting: number;
                type: string;
                content: string;
                children: { content: string; type: string; markup: string }[];
            }[],
            idx: number
        ) {
            if (tokens[idx].nesting === 1) {
                var type = tokens[idx].info.trim().match(/\+?( ?)ad-(?<type>\w+)/);
                if (type) {
                    let title = type[2][0].toUpperCase() + type[2].substring(1);
                    if (idx + 2 < tokens.length && tokens[idx + 2].type === 'inline') {
                        let titleStartFound = false;
                        let childrenToRemove : {content: string, type: string, markup: string}[] = [];
                        for (let i = 0; i < tokens[idx + 2].children.length; i++) {
                            const c = tokens[idx + 2].children[i];
                            if (titleStartFound) {
                                if (c.type === 'softbreak') {
                                    break;
                                } else {
                                    // title += c.markup || c.content;
                                    childrenToRemove.push(c);
                                }
                            } else {
                                const m = c.content.match(/(title:( ?)([^\n]+))/);
                                if (m != null && m.length > 3) {
                                    title = m[3];
                                    titleStartFound = true;
                                    childrenToRemove.push(c);
                                }
                            }
                        }
                        const matches = tokens[idx + 2].content.match(/(title:( ?)([^\n]+)\n)/);
                        if (matches && matches.length > 3) {
                            title = matches[3];
                        }
                        tokens[idx + 2].children = tokens[idx + 2].children.filter(
                            (c) => childrenToRemove.indexOf(c) < 0
                        );
                    }
                    // opening tag
                    return `<div class="admonition ${type[2]}" name="${type[2]}"><div class="admonition-title"><h3>${title}</h3></div>\n<div class="admonition-content">`;
                }else{
                  return '?\n';
                }
            } else {
                // closing tag
                return '</div></div>\n';
            }
        }
    });
    // }
  }

  async renderMd(content: string){
    await this.initMDIt();
    if(this.mdIt){
      return this.mdIt.render(content);
    }else{
      return 'MD Engine not available...';
    }
  }

  async markdownToNote(title: string, mdContent: string){
    let htmlContent = await this.renderMd(mdContent);
    htmlContent = htmlContent.replace(/katex-display/g,"math-tex");
    return await this.createNote({title: title, content: htmlContent, creationTime: Date.now()});
  }


  async cardToMarkdown(
    card: CardEntry | CardEntryContent,
    mdOptions: { embedImages?: boolean; markdownFlavor?: 'default' | 'mkdocs' | 'obsidian' | 'html' } = {
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
      
                    tmp.href = reader.result
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

    let res : string = '';
    if(mdOptions.markdownFlavor && mdOptions.markdownFlavor === 'html'){
      res = cleanContent;
    }else{
    const turndownService = new TurndownService({
      hr: '---------',
      codeBlockStyle: 'indented',
      bulletListMarker: '-',
      headingStyle: 'atx'
    });
    turndownService.keep(['img']);

    turndownService.addRule('highlighter', {
      filter(node, options) {
        return node.tagName === 'MARK';
      },
      replacement(content, node, options) {
        if((node as HTMLElement).classList.length > 0){
          const color = (node as HTMLElement).classList[0];
          return `<mark style="background-color: ${color.replace('marker-','').replace('-','')}">${content}</mark>`;
        }else{
          return `==${content}==`
        }
      },
    });
    turndownService.remove((node, options) => node.classList.contains('admonition-title'));
    
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


    turndownService.addRule('admonition', {
      filter(node, options) {
        return node.classList.contains('admonition');
      },
      replacement(content, node, options) {
        console.log({ node });
        let type = 'note';
        (node as any).classList.forEach((className: string) => {
          if (className !== 'admonition' && className !== 'ck-widget' && className !== 'default') {
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
