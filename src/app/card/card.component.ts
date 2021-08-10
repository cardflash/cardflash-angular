import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import * as CustomBalloonEditor from 'src/ckeditor/ckeditor.js';
import { CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import { Card } from '../types/card';
import { HttpClient } from '@angular/common/http';
import { UserNotifierService } from '../services/notifier/user-notifier.service';
import { DataService } from '../data.service';
import { imgSrcToBlob, imgSrcToDataURL } from 'blob-util';
import { CardService } from './card.service';
import { Router } from '@angular/router';
import { Annotation } from '../types/annotation';
import { environment } from 'src/environments/environment';

const ImageEditor = require('tui-image-editor');

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent implements OnInit, AfterViewInit {
  FrontEditor: any;
  BackEditor: any;

  @ViewChild('frontEditor') frontEditorComponent?: CKEditorComponent;
  @ViewChild('backEditor') backEditorComponent?: CKEditorComponent;
  @ViewChild('downloadAnchor')
  private downloadAnchor?: ElementRef<HTMLAnchorElement>;

  @Output('delete') deleteEvent: EventEmitter<string> =
    new EventEmitter<string>();

  @Output('deleteAnnotation') deleteAnnotationEvent: EventEmitter<{
    annotationID: string;
  }> = new EventEmitter<{ annotationID: string }>();

  @Output('scrollToAnnotation') scrollToAnnotationEvent: EventEmitter<{
    annotationID: string;
    where: 'pdf' | 'card' | 'both';
  }> = new EventEmitter<{
    annotationID: string;
    where: 'pdf' | 'card' | 'both';
  }>();

  @Input('card') card: Card = {
    localID: '0',
    page: 0,
    title: '',
    chapter: '',
    front: '',
    back: '',
    hiddenText: '',
  };

  public annotations: { id: string; color: string }[] = [];

  @Output('cardChange') cardChange: EventEmitter<Card> =
    new EventEmitter<Card>();

  @Input('frontActive') frontActive: boolean = true;
  @Input('active') active: boolean = false;
  @Input('deckName') deckName?: string = this.dataService.config.deckName;

  private readonly MODEL_VERSION: string = '2.2a';

  @ViewChildren('annotationHelperFront') annotationHelperFront?: QueryList<
    ElementRef<HTMLDivElement>
  >;
  @ViewChildren('annotationHelperBack') annotationHelperBack?: QueryList<
    ElementRef<HTMLDivElement>
  >;

  public showimageEditOverlay : boolean = false;

  public imageEditorInstance: any;

  public imageInEditingURL : string = '';

  @ViewChild('imageEditOverlay') imageEditOverlay!: ElementRef<HTMLDivElement>;
  constructor(
    private http: HttpClient,
    private userNotifierService: UserNotifierService,
    private dataService: DataService,
    private cardService: CardService
  ) {}

  public readonly EDITOR_CONFIG = {
    highlight: {
      options: [
        {
          model: 'yellowMarker',
          class: 'marker-yellow',
          title: 'Yellow marker',
          color: 'var(--ck-highlight-marker-yellow)',
          type: 'marker',
        },
        {
          model: 'greenMarker',
          class: 'marker-green',
          title: 'Green marker',
          color: 'var(--ck-highlight-marker-green)',
          type: 'marker',
        },
        {
          model: 'pinkMarker',
          class: 'marker-pink',
          title: 'Pink marker',
          color: 'var(--ck-highlight-marker-pink)',
          type: 'marker',
        },
        {
          model: 'blueMarker',
          class: 'marker-blue',
          title: 'Blue marker',
          color: 'var(--ck-highlight-marker-blue)',
          type: 'marker',
        },
        {
          model: 'lightYellowMarker',
          class: 'marker-light-yellow',
          title: 'Light yellow marker',
          color: '#fef8934f',
          type: 'marker',
        },
        {
          model: 'lightBlueMarker',
          class: 'marker-light-blue',
          title: 'Light blue marker',
          color: '#5eacf94f',
          type: 'marker',
        },
        {
          model: 'lightGreenMarker',
          class: 'marker-light-green',
          title: 'Light green marker',
          color: '#5ef98c4f',
          type: 'marker',
        },
        {
          model: 'lightPinkMarker',
          class: 'marker-light-pink',
          title: 'Light pink marker',
          color: '#f95ef34f',
          type: 'marker',
        },
        {
          model: 'redPen',
          class: 'pen-red',
          title: 'Red pen',
          color: 'var(--ck-highlight-pen-red)',
          type: 'pen',
        },
        {
          model: 'greenPen',
          class: 'pen-green',
          title: 'Green pen',
          color: 'var(--ck-highlight-pen-green)',
          type: 'pen',
        },
      ],
    },
    htmlSupport: {
      allow: [
        {
          name: 'span',
          attributes: true,
        },
      ],
    },
    toolbar: {
      items: [
        'bold',
        'italic',
        'highlight',
        'underline',
        'strikethrough',
        'removeFormat'
      ]
    },
    language: 'en',
    blockToolbar: [
      'heading',
      'horizontalLine',
      'alignment',
      'bulletedList',
      'numberedList',
      'indent',
      'outdent',
      'link',
      'blockQuote',
      'specialCharacters',
      'fontSize',
      'fontBackgroundColor',
      'fontColor',
      'subscript',
      'superscript',
      'code',
      'codeBlock',
      'insertTable',
      'imageUpload',
      'imageInsert',
      'mediaEmbed',
      'htmlEmbed',
      'undo',
      'redo'
    ],
    image: {
      toolbar: [
        'imageTextAlternative',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        'linkImage'
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells'
      ]
    },
    licenseKey: '',
  };

  ngOnInit(): void {
    if (!this.card.creationTime) {
      this.card.creationTime = Date.now();
    }
    this.FrontEditor = CustomBalloonEditor;
    this.BackEditor = CustomBalloonEditor;

    setTimeout(() => this.cardUpdated(), 300);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.cardUpdated();
    }, 800);
    this.imageEditorInstance =  new ImageEditor(document.querySelector('#tui-image-editor-container'), {
      usageStatistics: false,
      includeUI: {
        theme: {
  'common.bisize.width': '251px',
  'common.bisize.height': '21px',
  'common.backgroundColor': '#fafafa',
  'common.border': '1px solid #c1c1c1',

  // header
  'header.backgroundImage': 'none',
  'header.backgroundColor': 'transparent',
  'header.border': '0px',

  // load button
  'loadButton.backgroundColor': '#fff',
  'loadButton.border': '1px solid #ddd',
  'loadButton.color': '#222',
  'loadButton.fontFamily': "'Noto Sans', sans-serif",
  'loadButton.fontSize': '12px',

  // download button
  'downloadButton.backgroundColor': '#fff',
  'downloadButton.border': '1px solid #fff',
  'downloadButton.color': '#000',
  'downloadButton.fontFamily': "'Noto Sans', sans-serif",
  'downloadButton.fontSize': '12px',

  // main icons
  'menu.normalIcon.color': '#8a8a8a',
  'menu.activeIcon.color': '#555555',
  'menu.disabledIcon.color': '#434343',
  'menu.hoverIcon.color': '#e9e9e9',
  'menu.iconSize.width': '24px',
  'menu.iconSize.height': '24px',

  // submenu icons
  'submenu.normalIcon.color': '#8a8a8a',
  'submenu.activeIcon.color': '#555555',
  'submenu.iconSize.width': '32px',
  'submenu.iconSize.height': '32px',

  // submenu primary color
  'submenu.backgroundColor': 'transparent',
  'submenu.partition.color': '#e5e5e5',

  // submenu labels
  'submenu.normalLabel.color': '#858585',
  'submenu.normalLabel.fontWeight': 'normal',
  'submenu.activeLabel.color': '#000',
  'submenu.activeLabel.fontWeight': 'normal',

  // checkbox style
  'checkbox.border': '1px solid #ccc',
  'checkbox.backgroundColor': '#fff',

  // rango style
  'range.pointer.color': '#333',
  'range.bar.color': '#ccc',
  'range.subbar.color': '#606060',

  'range.disabledPointer.color': '#d3d3d3',
  'range.disabledBar.color': 'rgba(85,85,85,0.06)',
  'range.disabledSubbar.color': 'rgba(51,51,51,0.2)',

  'range.value.color': '#000',
  'range.value.fontWeight': 'normal',
  'range.value.fontSize': '11px',
  'range.value.border': '0',
  'range.value.backgroundColor': '#f5f5f5',
  'range.title.color': '#000',
  'range.title.fontWeight': 'lighter',

  // colorpicker style
  'colorpicker.button.border': '0px',
  'colorpicker.title.color': '#000',
  'controls.backgroundColor': '#fff'
          // 'downloadButton.backgroundColor': '#28395ef1',
          // 'loadButton.backgroundColor': '#28395ef1',
          // 'loadButton.color': '#fff',
          // 'loadButton.border': 'none',
          // 'downloadButton.border': 'none',
          
        },
        loadImage: {
          path: 'assets/favicons/android-chrome-192x192.png',
          name: 'No image provided'
        },
        initMenu: 'filter',
        menuBarPosition: 'bottom',
      },
      cssMaxWidth: 700,
      cssMaxHeight: 800,
      selectionStyle: {
        cornerSize: 20,
        rotatingPointOffset: 70,
      },
    });
    console.log(this.imageEditorInstance)
  }

  change() {
    this.cardChange.emit(this.card);
    this.addAnnotationHelpers();
  }

  addAnnotationHelpers() {
    if (
      this.frontEditorComponent?.editorInstance &&
      this.backEditorComponent?.editorInstance
    ) {
      const frontSourceEl: HTMLElement =
        this.frontEditorComponent.editorInstance.sourceElement;
      const backSourceEl: HTMLElement =
        this.backEditorComponent.editorInstance.sourceElement;
      this.annotations.forEach((annotation, index) => {
        const frontEl = frontSourceEl.querySelector(
          '#' + environment.ANNOTATION_ON_CARD_PREFIX + annotation.id
        );
        const backEl = backSourceEl.querySelector(
          '#' + environment.ANNOTATION_ON_CARD_PREFIX + annotation.id
        );
        let rect;
        let ref;
        if (frontEl) {
          rect = frontEl?.getBoundingClientRect();
          ref = this.annotationHelperFront?.get(index);
        } else {
          rect = backEl?.getBoundingClientRect();
          ref = this.annotationHelperBack?.get(index);
        }
        if (ref) {
          const parentRect =
            ref?.nativeElement.parentElement?.getBoundingClientRect();
          if (ref && rect && parentRect) {
            const top = rect.top - parentRect.top;
            if (top < 0 || top + 15 > parentRect.height) {
              ref.nativeElement.style.display = "none"
            } else {
              ref.nativeElement.style.display = 'block';
              ref.nativeElement.style.top =
                rect.top - parentRect.top + 40 + 'px';
              ref.nativeElement.style.left = -20 + 'px';
            }
          }
        }
      });
    }
  }

  cardUpdated() {
    setTimeout(() => {
      this.retrieveAnnotations();
      setTimeout(() => {
        this.addAnnotationHelpers();
      }, 300);
    }, 300);
  }

  retrieveAnnotations() {
    if (
      this.frontEditorComponent?.editorInstance &&
      this.backEditorComponent?.editorInstance
    ) {
      const frontSourceEl: HTMLElement =
        this.frontEditorComponent.editorInstance.sourceElement;
      const backSourceEl: HTMLElement =
        this.backEditorComponent.editorInstance.sourceElement;

      let frontSpans = frontSourceEl.querySelectorAll('span');
      let backSpans = backSourceEl.querySelectorAll('span');

      const annotations: Map<string,{ id: string; color: string }> = new Map<string,{id: string, color: string}>();
      frontSpans.forEach((span) => {
        if (span.id.includes(environment.ANNOTATION_ON_CARD_PREFIX)) {
          annotations.set(span.id.replace(environment.ANNOTATION_ON_CARD_PREFIX,''),{
            id: span.id.replace(environment.ANNOTATION_ON_CARD_PREFIX,''),
            color: span.getAttribute('annotationColor') || '#45454513',
          });
        }
      });

      backSpans.forEach((span) => {
        if (span.id.includes(environment.ANNOTATION_ON_CARD_PREFIX)) {
          annotations.set(span.id.replace(environment.ANNOTATION_ON_CARD_PREFIX,''),{
            id: span.id.replace(environment.ANNOTATION_ON_CARD_PREFIX,''),
            color: span.getAttribute('annotationColor') || '#45454513',
          });
        }
      });
      this.annotations = Array.from(annotations.values());
    }
  }

  getImages() {
    if (
      this.frontEditorComponent?.editorInstance &&
      this.backEditorComponent?.editorInstance
    ) {
      let imagelist: string[] = [];

      const frontSourceEl: HTMLElement =
        this.frontEditorComponent.editorInstance.sourceElement;
      const backSourceEl: HTMLElement =
        this.backEditorComponent.editorInstance.sourceElement;

      let frontImgs = frontSourceEl.querySelectorAll('img');
      let backImgs = backSourceEl.querySelectorAll('img');

      frontImgs.forEach((node) => {
        if (node.src.indexOf('data:') == 0) imagelist.push(node.src);
      });
      backImgs.forEach((node) => {
        if (node.src.indexOf('data:') == 0) imagelist.push(node.src);
      });
      return imagelist;
    } else {
      return [];
    }
  }

  replaceImageLinks(
    content: string,
    imagelist: string[],
    naming: (index: number) => string
  ) {
    for (let i = 0; i < imagelist.length; i++) {
      const img: string = imagelist[i];
      content = content.replace(img, naming(i));
    }
    return content;
  }

  async save(useAnkiConnect: boolean = false) {
    const imagelist = this.getImages();
    const ankiNamingFunc = (i: number) => this.card.localID + '-' + i + '.png';
    let newFrontContent = this.replaceImageLinks(
      this.card.front,
      imagelist,
      ankiNamingFunc
    );
    let newBackContent = this.replaceImageLinks(
      this.card.back,
      imagelist,
      ankiNamingFunc
    );

    if (useAnkiConnect) {
      let exReq = {
        action: 'findNotes',
        version: 6,
        params: {
          query: 'ID:' + this.card.localID,
        },
      };
      const exProm = this.makeHttpRequest(exReq);
      const exRes = await this.userNotifierService.notifyOnPromiseReject(
        exProm,
        'Getting note info'
      );
      console.log(exRes);
      const alreadyOnAnki =
        exRes.success && !exRes.result.error && exRes.result.result.length > 0;
      let ankiID = 0;
      if (alreadyOnAnki) {
        ankiID = exRes.result.result[0];
      }
      console.log(alreadyOnAnki);
      if (this.card.$id && this.card.imgs) {
        for (let i = 0; i < this.card.imgs.length; i++) {
          const src = this.dataService.getFileView(this.card.imgs[i]);
          const dataURL = await imgSrcToDataURL(
            src.href,
            'image/png',
            'use-credentials'
          );
          let imgReq = {
            action: 'storeMediaFile',
            version: 6,
            params: {
              filename: this.card.localID + '-' + i + '_SERVER' + '.png',
              data: dataURL.substring(22),
            },
          };
          const imgProm = this.makeHttpRequest(imgReq);
          const imgRes = await this.userNotifierService.notifyOnPromiseReject(
            imgProm,
            'Image Upload',
            'AnkiConnect is not reachable'
          );
          if (!imgRes.success || imgRes.result.error) {
            return;
          } else {
            newBackContent = newBackContent.replace(
              src.href,
              this.card.localID + '-' + i + '_SERVER' + '.png'
            );
            newFrontContent = newFrontContent.replace(
              src.href,
              this.card.localID + '-' + i + '_SERVER' + '.png'
            );
          }
        }
      }

      const modelCreated = await this.createModelinAnki();
      if (!modelCreated) {
        return;
      }

      let bodyData = {}
      if(alreadyOnAnki){
        bodyData = {
          action:  'updateNoteFields',
          version: 6,
          params: {
            note: {
              deckName: this.deckName,
              modelName: 'flashcards.siter.eu-V' + this.MODEL_VERSION,
              id: ankiID,
              fields: {
                Front: newFrontContent,
                Back: newBackContent,
                Title: this.card.title,
                Page: this.card.page.toString(),
                Chapter: this.card.chapter,
                Hidden: this.card.hiddenText,
              }
          }
        }
        };
      }else{
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
            deckName: this.deckName,
            modelName: 'flashcards.siter.eu-V' + this.MODEL_VERSION,
            fields: {
              ID: this.card.localID,
              Front: newFrontContent,
              Back: newBackContent,
              Title: this.card.title,
              Page: this.card.page.toString(),
              Chapter: this.card.chapter,
              Hidden: this.card.hiddenText,
              URL: this.card.$id ? environment.BASE_URL + '/cards/' + this.card.$id : environment.BASE_URL + '/cards/local/' + this.card.localID,
            },
            options: {
              allowDuplicate: false,
              duplicateScope: 'deck',
              duplicateScopeOptions: {
                deckName: this.deckName,
                checkChildren: false,
              },
            },
            tags: ['flashcards.siter.eu'],
            picture: [],
          },
        },
      };
    }

      for (let i = 0; i < imagelist.length; i++) {
        const img = imagelist[i];
        let imgReq = {
          action: 'storeMediaFile',
          version: 6,
          params: {
            filename: this.card.localID + '-' + i + '.png',
            data: img.substring(22),
          },
        };
        const imgProm = this.makeHttpRequest(imgReq);
        const imgRes = await this.userNotifierService.notifyOnRejectOrError(
          imgProm,
          'Image Upload',
          'AnkiConnect is not reachable',
          (res) => !res.success || res.result.error
        );
        if (imgRes.result['error']) {
          this.userNotifierService.notify(
            'Image upload failed',
            'AnkiConnect was reachable, but unable to upload the image',
            'danger'
          );
          return;
        }
        // .subscribe((res) => {
        //   console.log(res);
        //   if (res) {
        //     if (res && 'error' in res && res['error']) {
        //       this.toastrService.show(res['error'], 'Image Upload failed', {
        //         status: 'danger',
        //       });
        //     }
        //   } else {
        //     this.toastrService.show(
        //       'Check your settings and make sure Anki is running.',
        //       'Image Upload failed',
        //       { status: 'danger' }
        //     );
        //   }
        // });
      }
      const noteProm = this.makeHttpRequest(bodyData);
      const noteRes = await this.userNotifierService.notifyOnRejectOrError(
        noteProm,
        alreadyOnAnki
          ? 'Updating Node ' + this.card.localID
          : 'Adding Note' + this.card.localID,
        'AnkiConnect is not reachable',
        (res) => res.result['error']
      );
      if (noteRes.success) {
        this.userNotifierService.notify(
          alreadyOnAnki
            ? 'Updating Node ' + this.card.localID + ' was successfull'
            : 'Adding Note' + this.card.localID + ' was successfull',
          alreadyOnAnki ? 'Make sure that the Explore Page in Anki is not open (otherwise the change will be overwritten)' : '',
          'success',
          true
        );
      }
    } else {
      const blob = new Blob(
        [
          '"' +
            this.card.localID +
            '","' +
            newFrontContent.replace(/"/g, '""') +
            '","' +
            newBackContent.replace(/"/g, '""') +
            '"',
        ],
        { type: 'text/csv' }
      );

      if (this.downloadAnchor) {
        this.downloadAnchor.nativeElement.href =
          window.URL.createObjectURL(blob);
        this.downloadAnchor.nativeElement.download = this.card.localID + '.csv';
        this.downloadAnchor.nativeElement.click();

        for (let i = 0; i < imagelist.length; i++) {
          const img = imagelist[i];
          this.downloadAnchor.nativeElement.href = img.replace(
            'image/png',
            'image/octet-stream'
          );
          this.downloadAnchor.nativeElement.download =
            this.card.localID + '-' + i + '.png';
          this.downloadAnchor.nativeElement.click();
        }
      }
    }
  }

  async saveToServer() {
    const originalFront : string = this.card.front;
    const originalBack : string = this.card.back;
    console.log("Saving CARD to server", this.dataService.offlineMode);
    if(!this.dataService.offlineMode){
    const imagelist = this.getImages();
    let promises = [];
    for (let i = 0; i < imagelist.length; i++) {
      const img = imagelist[i];
      // img: data:image/png;base64,...
      const blob: Blob = await imgSrcToBlob(img);
      promises.push(
        this.dataService.saveImage(
          new File([blob], this.card.localID + '-' + i + '.png')
        )
      );
    }
    const imgRes = await Promise.all(promises);
    const saveNamingFunc = (i: number) =>
      this.dataService.getFileView(imgRes[i]).href;
    this.card.front = this.replaceImageLinks(
      this.card.front,
      imagelist,
      saveNamingFunc
    );
    this.card.back = this.replaceImageLinks(
      this.card.back,
      imagelist,
      saveNamingFunc
    );

    if (this.card.$id) {
      if (this.card.imgs) {
        const copy = [...this.card.imgs];
        for (let i = 0; i < copy.length; i++) {
          const id = copy[i];
          console.log(id);
          if (
            this.card.front.indexOf(id) < 0 &&
            this.card.back.indexOf(id) < 0
          ) {
            // Image reference was deleted
            await this.dataService.deleteFile(id);
            this.card.imgs?.splice(i, 1);
          }
        }
      }
    }

    if (this.card.imgs) {
      this.card.imgs = this.card.imgs.concat(imgRes);
    } else {
      this.card.imgs = imgRes;
    }
  }
    let res;
    if (this.card.$id) {
      res = await this.cardService.updateCard(this.card);
    } else {
      res = await this.cardService.addCard(this.card);
    }
    if(res.success){
      console.log("ATTENTION",res);
      this.card = res.result;
      return this.card;
    }else{
      console.log("ATTENTION: FAILED CARD SAVE",res);
      this.card.front = originalFront;
      this.card.back = originalBack;
      this.cardChange.emit(this.card);
      return undefined;
    }
  }

  deleteCard() {
    this.deleteEvent.emit(this.card.localID);
  }

  openHiddenTextDialog() {}

  makeHttpRequest(bodyData: any) {
    return this.http.post('http://localhost:8765', bodyData).toPromise();
  }

  async createModelinAnki(): Promise<boolean> {
    const ckEditorCss: string = await this.http
      .get('assets/card-styles.css', { responseType: 'text' })
      .toPromise();
    let bodyData = {
      action: 'createModel',
      version: 6,
      params: {
        modelName: 'flashcards.siter.eu-V' + this.MODEL_VERSION,
        inOrderFields: [
          'ID',
          'Front',
          'Back',
          'Title',
          'Page',
          'Chapter',
          'URL',
          'Hidden',
        ],
        css: ckEditorCss,
        cardTemplates: [
          {
            Name: 'flashcards.siter.eu Card-V' + this.MODEL_VERSION,
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
      if (
        res.result['error'] &&
        res.result['error'] !== 'Model name already exists'
      ) {
        await this.userNotifierService.notify(
          'Creating Model failed',
          'AnkiConnect was reachable, but unable to create the model\n' +
            res.result['error'],
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
    //   if (res) {
    //     if (res && 'error' in res && res['error'] && res['error']) {
    //       if (res['error'] !== 'Model name already exists') {
    //         this.toastrService.show(res['error'], 'Request failed', {
    //           status: 'danger',
    //         });
    //       }
    //     } else {
    //       this.toastrService.show('Model was created!', 'Request successful', {
    //         status: 'success',
    //       });
    //     }
    //   } else {
    //     this.toastrService.show(
    //       'Check your settings and make sure Anki is running.',
    //       'Request failed',
    //       { status: 'danger' }
    //     );
    //   }
    // });
  }

  async scrollToAnnotation(
    annotationID: string,
    where: 'pdf' | 'card' | 'both' = 'card'
  ) {
    this.scrollToAnnotationEvent.emit({
      annotationID: annotationID,
      where: where,
    });
  }

  deleteAnnotation(annotationID: string) {
    this.annotations = this.annotations.filter(
      (annot) => annot.id !== annotationID
    );
    this.deleteAnnotationEvent.emit({ annotationID: annotationID });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: any) {
    this.addAnnotationHelpers();
  }


  onDragOver(event: any){
    event.dataTransfer.dropEffect = "copy";
    event.preventDefault();
  }

  async onDrop(event: any){
    event.preventDefault();
    const src = event.dataTransfer.getData("URL");
    const dataURL = await imgSrcToDataURL(
      src,
      'image/png',
      'use-credentials'
    );
    this.imageInEditingURL = dataURL;
    this.imageEditorInstance.loadImageFromURL(this.imageInEditingURL,'Flashcard  Image');
    this.showimageEditOverlay = true;
    this.imageEditOverlay.nativeElement.focus();
  }

  finishImageEditing(saveResult: boolean = false){
    this.showimageEditOverlay = false;
    let url;
    if(saveResult){
      this.imageInEditingURL = this.imageEditorInstance.toDataURL();
    }else{
      url = this.imageInEditingURL;
    }
  }
}
