import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import * as CustomBalloonEditor from 'src/ckeditor/ckeditor.js';
import { CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import { HttpClient } from '@angular/common/http';
import { UserNotifierService } from '../services/notifier/user-notifier.service';
import { imgSrcToDataURL } from 'blob-util';
import { CardEntry, CardEntryContent, DataApiService } from '../data-api.service';
import { UtilsService } from '../utils.service';
import { MyUploadAdapter} from 'src/ckeditor/CustomUploadAdapter'

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

  @Output('delete') deleteEvent: EventEmitter<string> =
    new EventEmitter<string>();

  @Input('card') card: CardEntryContent= {
    page: 0,
    title: '',
    chapter: '',
    front: '',
    back: '',
    hiddenText: '',
    creationTime: -1
  };

  public annotations: { id: string; color: string }[] = [];
  @Output('cardChange') cardChange: EventEmitter<CardEntryContent | CardEntry> =
    new EventEmitter<CardEntryContent | CardEntry>();

  @Input('activeSide') activeSide: string = '';
  @Input('active') active: boolean = false;
  @Input('deckName') deckName?: string = this.dataApi.config.deckName;


  @Input('placeholderFront') placeholderFront: string = '';
  @Input('placeholderBack') placeholderBack: string = '';

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
    private dataApi: DataApiService,
    public utils: UtilsService
  ) {}


  ngOnInit(): void {
    if (!this.card.creationTime) {
      this.card.creationTime = Date.now();
    }
    this.FrontEditor = CustomBalloonEditor;
    this.BackEditor = CustomBalloonEditor;
    console.log(this.FrontEditor)

  }

  ngAfterViewInit(): void {
  //   this.imageEditorInstance =  new ImageEditor(document.querySelector('#tui-image-editor-container'), {
  //     usageStatistics: false,
  //     includeUI: {
  //       theme: {
  // 'common.bisize.width': '251px',
  // 'common.bisize.height': '21px',
  // 'common.backgroundColor': '#fafafa',
  // 'common.border': '1px solid #c1c1c1',

  // // header
  // 'header.backgroundImage': 'none',
  // 'header.backgroundColor': 'transparent',
  // 'header.border': '0px',

  // // load button
  // 'loadButton.backgroundColor': '#fff',
  // 'loadButton.border': '1px solid #ddd',
  // 'loadButton.color': '#222',
  // 'loadButton.fontFamily': "'Noto Sans', sans-serif",
  // 'loadButton.fontSize': '12px',

  // // download button
  // 'downloadButton.backgroundColor': '#fff',
  // 'downloadButton.border': '1px solid #fff',
  // 'downloadButton.color': '#000',
  // 'downloadButton.fontFamily': "'Noto Sans', sans-serif",
  // 'downloadButton.fontSize': '12px',

  // // main icons
  // 'menu.normalIcon.color': '#8a8a8a',
  // 'menu.activeIcon.color': '#555555',
  // 'menu.disabledIcon.color': '#434343',
  // 'menu.hoverIcon.color': '#e9e9e9',
  // 'menu.iconSize.width': '24px',
  // 'menu.iconSize.height': '24px',

  // // submenu icons
  // 'submenu.normalIcon.color': '#8a8a8a',
  // 'submenu.activeIcon.color': '#555555',
  // 'submenu.iconSize.width': '32px',
  // 'submenu.iconSize.height': '32px',

  // // submenu primary color
  // 'submenu.backgroundColor': 'transparent',
  // 'submenu.partition.color': '#e5e5e5',

  // // submenu labels
  // 'submenu.normalLabel.color': '#858585',
  // 'submenu.normalLabel.fontWeight': 'normal',
  // 'submenu.activeLabel.color': '#000',
  // 'submenu.activeLabel.fontWeight': 'normal',

  // // checkbox style
  // 'checkbox.border': '1px solid #ccc',
  // 'checkbox.backgroundColor': '#fff',

  // // rango style
  // 'range.pointer.color': '#333',
  // 'range.bar.color': '#ccc',
  // 'range.subbar.color': '#606060',

  // 'range.disabledPointer.color': '#d3d3d3',
  // 'range.disabledBar.color': 'rgba(85,85,85,0.06)',
  // 'range.disabledSubbar.color': 'rgba(51,51,51,0.2)',

  // 'range.value.color': '#000',
  // 'range.value.fontWeight': 'normal',
  // 'range.value.fontSize': '11px',
  // 'range.value.border': '0',
  // 'range.value.backgroundColor': '#f5f5f5',
  // 'range.title.color': '#000',
  // 'range.title.fontWeight': 'lighter',

  // // colorpicker style
  // 'colorpicker.button.border': '0px',
  // 'colorpicker.title.color': '#000',
  // 'controls.backgroundColor': '#fff'
  //         // 'downloadButton.backgroundColor': '#28395ef1',
  //         // 'loadButton.backgroundColor': '#28395ef1',
  //         // 'loadButton.color': '#fff',
  //         // 'loadButton.border': 'none',
  //         // 'downloadButton.border': 'none',
          
  //       },
  //       loadImage: {
  //         path: 'assets/favicons/android-chrome-192x192.png',
  //         name: 'No image provided'
  //       },
  //       initMenu: 'filter',
  //       menuBarPosition: 'bottom',
  //     },
  //     cssMaxWidth: 700,
  //     cssMaxHeight: 800,
  //     selectionStyle: {
  //       cornerSize: 20,
  //       rotatingPointOffset: 70,
  //     },
  //   });
  //   console.log(this.imageEditorInstance)
  }

  change() {
    console.log('CHANGE')
    if(!window.onbeforeunload){
      window.onbeforeunload = function (e) {
        // Cancel the event
        e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
        // Chrome requires returnValue to be set
        e.returnValue = '';
      }
    }
    this.cardChange.emit(this.card);
  }

  deleteCard() {
    this.deleteEvent.emit(this.card.creationTime+'');
  }

  makeHttpRequest(bodyData: any) {
    return this.http.post('http://localhost:8765', bodyData).toPromise();
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

  onEditorReady(editor: any){
    console.log('onEditorReady',{editor})
    // editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
    //   return new MyUploadAdapter(loader, this.dataApi.getProviderInstance());
    // }

  }
}
