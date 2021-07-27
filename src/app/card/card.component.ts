import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import * as CustomBalloonEditor from 'src/ckeditor/ckeditor.js';
import { CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import { Card } from '../types/card';
import { HttpClient } from '@angular/common/http';
import { UserNotifierService } from '../services/notifier/user-notifier.service';
import { DataService } from '../data.service';
import { imgSrcToBlob } from 'blob-util';
import { CardService } from './card.service';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent implements OnInit {
  FrontEditor: any;
  BackEditor: any;

  @ViewChild('frontEditor') frontEditorComponent?: CKEditorComponent;
  @ViewChild('backEditor') backEditorComponent?: CKEditorComponent;
  @ViewChild('downloadAnchor')
  private downloadAnchor?: ElementRef<HTMLAnchorElement>;

  @Output('delete') deleteEvent: EventEmitter<string> =
    new EventEmitter<string>();

  @Input('card') card: Card = {
    localID: '0',
    page: 0,
    title: '',
    chapter: '',
    front: '',
    back: '',
    hiddenText: '',
  };
  @Output('cardChange') cardChange: EventEmitter<Card> =
    new EventEmitter<Card>();

  @Input('frontActive') frontActive: boolean = true;
  @Input('active') active: boolean = false;
  @Input('deckName') deckName?: string;

  @Input('alreadyOnServer') alreadyOnServer: boolean = false;

  private readonly MODEL_VERSION: string = '2.1a';

  constructor(
    private http: HttpClient,
    private userNotifierService: UserNotifierService,
    private dataService: DataService,
    private cardService: CardService
  ) {}

  public readonly EDITOR_CONFIG = {
					
    toolbar: {
      items: [
        'bold',
        'italic',
        'highlight',
        'underline',
        'strikethrough'
      ]
    },
    language: 'en',
    blockToolbar: [
      'heading',
      'alignment',
      'bulletedList',
      'numberedList',
      'indent',
      'outdent',
      'link',
      'blockQuote',
      'specialCharacters',
      'fontSize',
      'fontColor',
      'fontBackgroundColor',
      'subscript',
      'superscript',
      'code',
      'removeFormat',
      'horizontalLine',
      'insertTable',
      'imageInsert',
      'mediaEmbed',
      'codeBlock',
      'htmlEmbed',
      'sourceEditing',
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
        'mergeTableCells',
        'tableCellProperties',
        'tableProperties'
      ]
    },
      licenseKey: '',
      
      
      
    };


  ngOnInit(): void {
    if(!this.card.creationTime){
      this.card.creationTime = Date.now();
    }
    this.FrontEditor = CustomBalloonEditor;
    this.BackEditor = CustomBalloonEditor;

    if (this.card.imgs) {
      // const serverNamingFunc = (i : number) => this.dataService.getFileView(this.card.imgs![i]).href;
      // let newFrontContent = this.replaceImageLinks(this.card.front,this.card.imgs,serverNamingFunc);
      // let newBackContent = this.replaceImageLinks(this.card.back,this.card.imgs,serverNamingFunc);
      // console.log(newFrontContent);
      // this.card.front = newFrontContent;
      // this.card.back = newBackContent;
    }
  }

  change() {
    this.cardChange.emit(this.card);
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
    const ankiNamingFunc = (i: number) => this.card.localID + '-' + i + '.png';
    const imagelist = this.getImages();
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
      const modelCreated = await this.createModelinAnki();
      if (!modelCreated) {
        return;
      }

      let bodyData = {
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
        const imgRes = await this.userNotifierService.notifyOnPromiseReject(
          imgProm,
          'Image Upload',
          'AnkiConnect is not reachable'
        );
        if (!imgRes.success) {
          return;
        }
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
      const noteRes = await this.userNotifierService.notifyOnPromiseReject(
        noteProm,
        'Adding Note' + this.card.localID,
        'AnkiConnect is not reachable'
      );
      if (noteRes.result['error']) {
        this.userNotifierService.notify(
          'Adding Note failed',
          'AnkiConnect was reachable, but unable to add the note',
          'danger'
        );
      } else {
        this.userNotifierService.notify(
          'Adding Note was successfull',
          '',
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
    if (!this.dataService.offlineMode) {
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
      console.log(this.card.imgs);
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

      console.log(this.card.imgs);
      if (this.alreadyOnServer) {
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
              await this.dataService.deleteImage(id);
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
      if (this.alreadyOnServer) {
        const res = await this.cardService.updateCard(this.card);
      } else {
        const res = await this.cardService.addCard(this.card);
        this.alreadyOnServer = true;
      }
    }
  }

  deleteCard(){
    this.deleteEvent.emit(this.card.localID);
  }

  openHiddenTextDialog() {}

  makeHttpRequest(bodyData: any) {
    return this.http.post('http://localhost:8765', bodyData).toPromise();
  }

  async createModelinAnki(): Promise<boolean> {
    const ckEditorCss: string = await this.http
      .get('/assets/card-styles.css', { responseType: 'text' })
      .toPromise();
    console.log(ckEditorCss);
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
          'Hidden',
        ],
        css: ckEditorCss,
        cardTemplates: [
          {
            Name: 'flashcards.siter.eu Card-V' + this.MODEL_VERSION,
            Front:
              "<div class='ck-content'><h4 style='margin: 0'>{{Title}}</h4><br><h5 style='margin: 0'>{{Chapter}}</h5><br> {{Front}}</div>",
            Back: "<div class='ck-content'><h4 style='margin: 0'>{{Title}}</h4><br><h5 style='margin: 0'>{{Chapter}}</h5><br> {{Front}} <hr id=answer> {{Back}} <br><br> ID: {{ID}}; Page: {{Page}}</div>",
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
}
