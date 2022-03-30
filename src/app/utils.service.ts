import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CardEntry, CardEntryContent, DataApiService } from './data-api.service';
import { UserNotifierService } from './services/notifier/user-notifier.service';
import { Annotation } from './types/annotation';
import {imgSrcToDataURL, dataURLToBlob } from 'blob-util';
import { FabOption } from './fab-expand-button/fab-expand-button.component';

declare var LeaderLine: any;

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  readonly settings = {
    animateLines: true,
  };

  public availableAnnotationColors: { hex: string; marker: string }[] = [
    { hex: '#f3ea504f', marker: 'marker-light-yellow' },
    { hex: '#5eacf94f', marker: 'marker-light-blue' },
    { hex: '#5ef98c4f', marker: 'marker-light-green' },
    { hex: '#f95ef34f', marker: 'marker-light-pink' },
  ];

  public addToCardOptions: FabOption[] = [
    { id: 'p', icon: 'short_text', title: 'Normal paragraph' },
    { id: 'h1', icon: 'title', title: 'Title' },
    { id: 'ul', icon: 'format_list_bulleted', title: 'Bulleted list' },
    { id: 'ol', icon: 'format_list_numbered', title: 'Numbered list' },
  ];
  public annotationColorOptions: FabOption[] = [{ id: '#45454500', icon: 'text_fields' }];
  public selectedColorOption: FabOption = this.annotationColorOptions[0];
  public selectedOption: FabOption = this.addToCardOptions[0];

  public addAreaOptions: FabOption[] = [
    { id: 'image', icon: 'image', title: 'Add as image' },
    { id: 'text', icon: 'text_snippet', title: 'Add only text content' },
  ];
  public selectedAddAreaOption: FabOption = this.addAreaOptions[0];

  constructor(
    private dataApi: DataApiService,
    private http: HttpClient,
    private userNotifierService: UserNotifierService
  ) {}

  isIDInView(id: string) {
    const el = document.getElementById(id);
    if (el) {
      return this.isElementInView(el);
    } else {
      return false;
    }
  }
  isElementInView(el: Element) {
    const elClientRect = el.getBoundingClientRect();
    const clientRect = document.body.getBoundingClientRect();
    return !(
      elClientRect.top < clientRect.top ||
      elClientRect.bottom > clientRect.bottom ||
      elClientRect.right > clientRect.right ||
      elClientRect.left < clientRect.left
    );
  }

  scrollIDIntoView(id: string) {
    const el = document.getElementById(id);
    if (el && !this.isIDInView(id)) {
      el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }

  createLineBetweenIds(
    fromID: string,
    toID: string,
    color: string = '#943262',
    size = 7,
    dash = true,
    animate = true
  ) {
    // console.log({fromID},{toID})
    const from = document.getElementById(fromID);
    const to = document.getElementById(toID);
    if (from == undefined || to == undefined) {
      return;
    } else {
      return this.createLineBetweenElements(from, to, color, size, dash, animate);
    }
  }

  createLineBetweenElements(
    from: Element,
    to: Element,
    color: string = '#943262',
    size = 7,
    dash = true,
    animate = true
  ) {
    const line = new LeaderLine(from, to, {
      startPlug: 'disc',
      endPlug: 'disc',
      color: color.substring(0, 7) + 'ba',
      showEffectName: 'draw',
      size: size,
      startPlugSize: 0.7,
      endPlugSize: 0.7,
      dash: dash ? (animate ? { animation: true } : true) : undefined,
      path: 'magnet',
      hide: true,
      animOptions: { duration: 500, timing: [0.58, 0, 0.42, 1] },
      // outline: true,
      // outlineColor: outlineColor,
      // outlineSize: 0.1
    });
    line.position();
    if (this.settings.animateLines) {
      line.show('draw', { duration: 250, timing: [0.58, 0, 0.42, 1] });
    } else {
      line.show();
    }
    return line;
  }

  async generateReferenceFromAnnotation(
    annotation: Annotation,
    documentID: string = '',
    annotationImgURL?: string
  ) {
    let imgURL: string | undefined;
    if (
      annotationImgURL &&
      (annotationImgURL.indexOf('data:') === 0 || annotationImgURL.indexOf('blob:') === 0)
    ) {
      imgURL = annotationImgURL;
    } else if (annotation.imgID) {
      imgURL = (await this.dataApi.getFileView(annotation.imgID)).href;
    }
    let reference = '';
    if (annotation.imgID) {
      reference = `<figure class="image"><img src="${imgURL}" alt="${annotation.hiddenText?.replace(
        /"/g,
        "'"
      )}" data-imageid="${annotation.imgID}"></figure>`;
    }
    const color = this.availableAnnotationColors.find((val) => val.hex === annotation?.color);
    let innerEl = '';
    if (color) {
      innerEl = `<mark class="${color.marker}"><span data-annotationid="_${annotation.id}">${
        annotation?.text || annotation.id
      }</span></mark>`;
      if (this.dataApi.config.enableAnnotationLinking) {
        innerEl = '[' + innerEl + ']';
      }
    } else if (annotation.text || this.dataApi.config.enableAnnotationLinking) {
      innerEl = `<span data-annotationid="_${annotation.id}">${
        this.dataApi.config.enableAnnotationLinking ? '[' : ''
      }${annotation?.text || '📌'}${
        this.dataApi.config.enableAnnotationLinking ? ']' : ''
      }</span><span>&zwnj;</span>`;
    }
    if (this.dataApi.config.enableAnnotationLinking) {
      reference += `<a href="${environment.PDF_ANNOT_URL}${documentID ? '/' : ''}${documentID}#${
        annotation?.id
      }">${innerEl}</a>`;
    } else {
      reference += `${innerEl}`;
    }
    let content: string = `${reference}<br>`;
    if (!annotation.imgID) {
      switch (this.selectedOption.id) {
        case 'h1':
          content = `<h1>${reference}</h1>`;
          break;
        case 'ul':
          content = `<ul><li>${reference}</li></ul>`;
          break;
        case 'ol':
          content = `<ol><li>${reference}</li></ol>`;
          break;
      }
    }
    return content;
  }

  // async regenerateImageObjectURLs(
  //   card: CardEntry
  // ): Promise<CardEntry> {
  //   const domParser = new DOMParser();
  //   const docFront = domParser.parseFromString(card.front, 'text/html');
  //   const docBack = domParser.parseFromString(card.back, 'text/html');
  //   const imgSavePromises: Promise<void>[] = [];
  //   for (const side of [docFront, docBack]) {
  //     let imgs = side.querySelectorAll<HTMLImageElement>('img[data-imageid]');
  //     for (let i = 0; i < imgs.length; i++) {
  //       const node = imgs[i];
  //       const imageId = node.getAttribute('data-imageid');
  //       if (imageId !== null) {
  //         imgSavePromises.push(
  //           new Promise<void>(async (resolve, reject) => {
  //             try {
  //               node.src = (await this.dataApi.getFileView(imageId)).href;
  //               resolve();
  //             } catch (e) {
  //               reject(e);
  //             }
  //           })
  //         );
  //       }
  //     }
  //   }
  //   await Promise.all(imgSavePromises);
  //   card.front = docFront.documentElement.outerHTML;
  //   card.back = docBack.documentElement.outerHTML;
  //   return card;
  // }

  getImages(card: CardEntry | CardEntryContent) {
    let imagelist: string[] = [];

    const domParser = new DOMParser();

    const doc = domParser.parseFromString(card.front + '<br>' + card.back, 'text/html');

    let imgs = doc.querySelectorAll('img');

    imgs.forEach((node) => {
      if (node.src.indexOf('data:') === 0) imagelist.push(node.src);
    });

    return imagelist;
  }

  replaceImageLinks(content: string, imagelist: string[], naming: (index: number) => string) {
    for (let i = 0; i < imagelist.length; i++) {
      const img: string = imagelist[i];
      content = content.replace(img, naming(i));
    }
    return content;
  }

  getServerImageList(card: CardEntry | CardEntryContent) {
    const domParser = new DOMParser();

    const doc = domParser.parseFromString(card.front + '<br>' + card.back, 'text/html');

    let serverImages: string[] = [];

    doc
      .querySelectorAll('[data-imageid]')
      .forEach((el) => serverImages.push(el.getAttribute('data-imageid')!));
    return serverImages;
  }

  makeHttpRequest(bodyData: any) {
    return this.http.post('http://localhost:8765', bodyData).toPromise();
  }

  async createModelinAnki(): Promise<boolean> {
    const ckEditorCss: string = await this.http
      .get('/assets/card.css', { responseType: 'text' })
      .toPromise();
    let bodyData = {
      action: 'createModel',
      version: 6,
      params: {
        modelName: 'cardflash.net-V' + environment.ANKI_MODEL_VERSION,
        inOrderFields: ['ID', 'Front', 'Back', 'Title', 'Page', 'Chapter', 'URL', 'Hidden'],
        css: ckEditorCss,
        cardTemplates: [
          {
            Name: 'cardflash.net Card-V' + environment.ANKI_MODEL_VERSION,
            Front:
              "<div class='ck-content'><h4 style='margin: 0'>{{Title}}</h4><br><h5 style='margin: 0'>{{Chapter}}</h5><br> {{Front}}</div>",
            Back: "<div class='ck-content'><h4 style='margin: 0'>{{Title}}</h4><br><h5 style='margin: 0'>{{Chapter}}</h5><br> {{Front}} <hr id=answer> {{Back}} <br><br> ID: {{ID}}; Page: {{Page}}  <a href=\"{{URL}}\">View online</a></div>",
          },
        ],
      },
    };
    const modelProm = this.makeHttpRequest(bodyData);
    const res = await this.userNotifierService.notifyOnPromiseReject(
      modelProm,
      'Creating Model',
      'AnkiConnect is not reachable'
    );
    if (res.success) {
      console.log(res);
      if (res.result['error'] && res.result['error'] !== 'Model name already exists') {
        await this.userNotifierService.notify(
          'Creating Model failed',
          'AnkiConnect was reachable, but unable to create the model\n' + res.result['error'],
          'danger'
        );
        return false;
      } else if (!res.result['error']) {
        // await this.userNotifierService.notify("Creating Model was successfull",'',"success",true);
      }
      return true;
    } else {
      return false;
    }
  }

  async exportCard(card: CardEntry | CardEntryContent, to: 'anki' | 'download', deckName?: string) {
    // const imagelist = this.getImages(card);
    const serverImages = this.getServerImageList(card);
    let newFrontContent = card.front; //this.replaceImageLinks(card.front, imagelist, ankiNamingFunc);
    let newBackContent = card.back; //this.replaceImageLinks(card.back, imagelist, ankiNamingFunc);
    console.log({ newBackContent });

    if (to === 'anki') {
      let exReq = {
        action: 'findNotes',
        version: 6,
        params: {
          query: 'ID:' + card.creationTime,
        },
      };
      const exProm = this.makeHttpRequest(exReq);
      const exRes = await this.userNotifierService.notifyOnPromiseReject(
        exProm,
        'Getting note info'
      );
      console.log(exRes);
      const alreadyOnAnki = exRes.success && !exRes.result.error && exRes.result.result.length > 0;
      let ankiID = 0;
      if (alreadyOnAnki) {
        ankiID = exRes.result.result[0];
      }

      const domParser = new DOMParser();
      const docFront = domParser.parseFromString(card.front, 'text/html');
      const docBack = domParser.parseFromString(card.back, 'text/html');

      const imgSavePromises: Promise<void>[] = [];
      for (const side of [docFront, docBack]) {
        const serverImageEls = side.querySelectorAll('[data-imageid]');
        for (let i = 0; i < serverImageEls.length; i++) {
          const el = serverImageEls[i];
          imgSavePromises.push(
            new Promise(async (resolve, reject) => {
              const imageID = el.getAttribute('data-imageid');
              if (imageID !== null) {
                const src = await this.dataApi.getFileView(imageID);
                const dataURL = await imgSrcToDataURL(src.href, 'image/png', 'use-credentials');
                const ankiFilename = 'API_' + imageID + '.png';
                console.log({ dataURL });
                let imgReq = {
                  action: 'storeMediaFile',
                  version: 6,
                  params: {
                    filename: ankiFilename,
                    data: dataURL.substring(22),
                  },
                };
                const imgProm = this.makeHttpRequest(imgReq);
                this.userNotifierService
                  .notifyOnPromiseReject(imgProm, 'Image Upload', 'AnkiConnect is not reachable')
                  .then((res) => {
                    if (res.success) {
                      resolve();
                    } else {
                      reject();
                    }
                  })
                  .catch((error) => reject(error));
                el.setAttribute('src', ankiFilename);
              }
            })
          );
        }
      }
      await Promise.all(imgSavePromises);
      newFrontContent = docFront.documentElement.outerHTML;
      newBackContent = docBack.documentElement.outerHTML;

      // console.log({ serverImages });
      // if (serverImages) {
      //   for (let i = 0; i < serverImages.length; i++) {
      //     const src = await this.dataApi.getFileView(serverImages[i]);
      //     const dataURL = await imgSrcToDataURL(src.href, 'image/png', 'use-credentials');
      //     console.log({dataURL})
      //     let imgReq = {
      //       action: 'storeMediaFile',
      //       version: 6,
      //       params: {
      //         filename: 'API_' + serverImages[i] + '.png',
      //         data: dataURL.substring(22),
      //       },
      //     };
      //     const imgProm = this.makeHttpRequest(imgReq);
      //     const imgRes = await this.userNotifierService.notifyOnPromiseReject(
      //       imgProm,
      //       'Image Upload',
      //       'AnkiConnect is not reachable'
      //     );
      //     if (!imgRes.success || imgRes.result.error) {
      //       return;
      //     } else {
      //       console.log('replacing back content',{newBackContent})
      //       newBackContent = newBackContent.replace(src.href, 'API_' + serverImages[i] + '.png');
      //       console.log('new back content',{newBackContent})
      //       newFrontContent = newFrontContent.replace(src.href, 'API_' + serverImages[i] + '.png');
      //     }
      //   }
      // }

      const modelCreated = await this.createModelinAnki();
      if (!modelCreated) {
        return;
      }

      let bodyData = {};
      if (alreadyOnAnki) {
        bodyData = {
          action: 'updateNoteFields',
          version: 6,
          params: {
            note: {
              deckName: deckName,
              modelName: 'cardflash.net-V' + environment.ANKI_MODEL_VERSION,
              id: ankiID,
              fields: {
                Front: newFrontContent,
                Back: newBackContent,
                Title: card.title,
                Page: card.page.toString(),
                Chapter: card.chapter,
                Hidden: card.hiddenText,
              },
            },
          },
        };
      } else {
        // if (alreadyOnAnki) {
        //   const delData = {
        //     action: 'deleteNotes',
        //     version: 6,
        //     params: {
        //       notes: [ankiID],
        //     },
        //   };
        //   const delProm = this.makeHttpRequest(delData);
        //   const delRes = await this.userNotifierService.notifyOnRejectOrError(
        //     delProm,
        //     'Deleting Note',
        //     'AnkiConnect is not reachable',
        //     (res) => !res.success || res.result.error
        //   );
        // }

        bodyData = {
          action: 'addNote',
          version: 6,
          params: {
            note: {
              deckName: deckName,
              modelName: 'cardflash.net-V' + environment.ANKI_MODEL_VERSION,
              fields: {
                ID: card.creationTime + '',
                Front: newFrontContent,
                Back: newBackContent,
                Title: card.title,
                Page: card.page.toString(),
                Chapter: card.chapter,
                Hidden: card.hiddenText,
                URL: environment.BASE_URL + '/cards/' + card.$id,
              },
              options: {
                allowDuplicate: false,
                duplicateScope: 'deck',
                duplicateScopeOptions: {
                  deckName: deckName,
                  checkChildren: false,
                },
              },
              tags: ['cardflash.net'],
              picture: [],
            },
          },
        };
      }

      // for (let i = 0; i < imagelist.length; i++) {
      //   const img = imagelist[i];
      //   let imgReq = {
      //     action: 'storeMediaFile',
      //     version: 6,
      //     params: {
      //       filename: card.creationTime + '-' + i + '.png',
      //       data: img.substring(22),
      //     },
      //   };
      //   const imgProm = this.makeHttpRequest(imgReq);
      //   const imgRes = await this.userNotifierService.notifyOnRejectOrError(
      //     imgProm,
      //     'Image Upload',
      //     'AnkiConnect is not reachable',
      //     (res) => !res.success || res.result.error
      //   );
      //   if (imgRes.result['error']) {
      //     this.userNotifierService.notify(
      //       'Image upload failed',
      //       'AnkiConnect was reachable, but unable to upload the image',
      //       'danger'
      //     );
      //     return;
      //   }
      //   // .subscribe((res) => {
      //   //   console.log(res);
      //   //   if (res) {
      //   //     if (res && 'error' in res && res['error']) {
      //   //       this.toastrService.show(res['error'], 'Image Upload failed', {
      //   //         status: 'danger',
      //   //       });
      //   //     }
      //   //   } else {
      //   //     this.toastrService.show(
      //   //       'Check your settings and make sure Anki is running.',
      //   //       'Image Upload failed',
      //   //       { status: 'danger' }
      //   //     );
      //   //   }
      //   // });
      // }
      const noteProm = this.makeHttpRequest(bodyData);
      const noteRes = await this.userNotifierService.notifyOnRejectOrError(
        noteProm,
        alreadyOnAnki ? 'Updating Node ' + card.creationTime : 'Adding Note' + card.creationTime,
        'AnkiConnect is not reachable',
        (res) => res.result['error']
      );
      if (noteRes.success) {
        this.userNotifierService.notify(
          alreadyOnAnki
            ? 'Updating Node ' + card.creationTime + ' was successfull'
            : 'Adding Note' + card.creationTime + ' was successfull',
          alreadyOnAnki
            ? 'Make sure that the Explore Page in Anki is not open (otherwise the change will be overwritten)'
            : '',
          'success',
          true
        );
      }
    } else {
      const blob = new Blob(
        [
          '"' +
            card.creationTime +
            '","' +
            newFrontContent.replace(/"/g, '""') +
            '","' +
            newBackContent.replace(/"/g, '""') +
            '"',
        ],
        { type: 'text/csv' }
      );

      const anchor = document.createElement('a');
      anchor.href = window.URL.createObjectURL(blob);
      anchor.download = card.creationTime + '.csv';
      anchor.click();

      // for (let i = 0; i < imagelist.length; i++) {
      //   const img = imagelist[i];
      //   anchor.href = img.replace('image/png', 'image/octet-stream');
      //   anchor.download = card.creationTime + '-' + i + '.png';
      //   anchor.click();
      // }
    }
  }

  async replaceWithServerImgs(card: CardEntryContent | CardEntry) {
    const domParser = new DOMParser();
    const docFront = domParser.parseFromString(card.front, 'text/html');
    const docBack = domParser.parseFromString(card.back, 'text/html');

    const imgSavePromises: Promise<void>[] = [];
    for (const side of [docFront, docBack]) {
      let imgs = side.querySelectorAll('img');
      card.imgIDs = card.imgIDs || [];
      for (let i = 0; i < imgs.length; i++) {
        const node = imgs[i];
        if (node.src.indexOf('data:') === 0) {

          imgSavePromises.push(
            new Promise<void>(async (resolve, reject) => {
              console.log('Saving image', node, node.src, 'to datapi');
              this.dataApi
                // .saveFile(new File([await imgSrcToBlob(node.src)], card.creationTime + '_img.png'))
                // dataURLToBlob
                .saveFile(new File([dataURLToBlob(node.src)], card.creationTime + '_img.png'))
                .then(async (file) => {
                  console.log('file saved', { file });
                  node.src = (await this.dataApi.getFileView(file.$id)).href;
                  node.setAttribute('data-imageid', file.$id);
                  card.imgIDs?.push(file.$id);
                  resolve();
                });
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

  async saveCard(
    card: CardEntry | CardEntryContent
  ): Promise<{ isNew: boolean; card: CardEntry } | null> {
    return new Promise<{ isNew: boolean; card: CardEntry } | null>(async (resolve, reject) => {
      if (!card.$id && !card.front && !card.back) {
        resolve(null);
      }
      card = await this.replaceWithServerImgs(card);
      const cardIsNew = !card.$id;
      const saveOrUpdatePromise: Promise<CardEntry> = card.$id
        ? this.dataApi.updateCard(card.$id, card)
        : this.dataApi.createCard(card);
      saveOrUpdatePromise
        .then(async (res) => {
          if (this.dataApi.config.autoAddAnki) {
            this.exportCard(res, 'anki', this.dataApi.config.deckName);
          }
          console.log('removing event listener');
          window.onbeforeunload = function (e) {
            delete e['returnValue'];
          };
          resolve({ isNew: cardIsNew, card: await this.dataApi.regenerateImageObjectURLs(res) });
        })
        .catch((reas) => {
          if (this.dataApi.config.autoAddAnki) {
            this.exportCard(card, 'anki', this.dataApi.config.deckName);
          }
          resolve(null);
        });
    });
  }
}
