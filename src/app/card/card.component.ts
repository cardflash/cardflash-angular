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
import { ChangeEvent, CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import { HttpClient } from '@angular/common/http';
import { UserNotifierService } from '../services/notifier/user-notifier.service';
import { imgSrcToDataURL } from 'blob-util';
import { CardEntry, CardEntryContent, DataApiService, DocumentEntry } from '../data-api.service';
import { UtilsService } from '../utils.service';
import { MyUploadAdapter} from 'src/ckeditor/CustomUploadAdapter'
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent implements OnInit, AfterViewInit {
  FrontEditor: any;
  BackEditor: any;

  private docs: DocumentEntry[] = [];
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
  public readonly EDITOR_CONFIG = {
    extraPlugins : [function MentionLinks( editor: any ) {
      // The upcast converter will convert a view
      //
      //		<a href="..." class="mention" data-mention="...">...</a>
      //
      // element to the model "mention" text attribute.
      editor.conversion.for( 'upcast' ).elementToAttribute( {
          view: {
              name: 'a',
              key: 'data-mention',
              classes: 'mention',
              attributes: {
                  href: true
              }
          },
          model: {
              key: 'mention',
              value: (viewItem : any) => editor.plugins.get( 'Mention' ).toMentionAttribute( viewItem )
          },
          converterPriority: 'high'
      } );
  
      // Downcast the model "mention" text attribute to a view
      //
      //		<a href="..." class="mention" data-mention="...">...</a>
      //
      // element.
      editor.conversion.for( 'downcast' ).attributeToElement( {
          model: 'mention',
          view: ( modelAttributeValue : any, { writer } : any) => {
              // Do not convert empty attributes (lack of value means no mention).
              if ( !modelAttributeValue ) {
                  return;
              }
  
              let href;
  
              // User mentions are downcasted as mailto: links. Tags become normal URLs.
              if ( modelAttributeValue.id[ 0 ] === '@' ) {
          href = `mailto:${ modelAttributeValue.id.slice( 1 ) }@example.com`;
              } else {
                  href = modelAttributeValue.href;
              }
  
              return writer.createAttributeElement( 'a', {
                  class: 'mention',
                  'data-mention': modelAttributeValue.id,
                  href
              }, {
                  // Make mention attribute to be wrapped by other attribute elements.
                  priority: 20,
                  // Prevent merging mentions together.
                  id: modelAttributeValue.uid
              } );
          },
          converterPriority: 'high'
      } );
  }],
    mention: {
      feeds: [
    {marker: '[',
    feed: this.getSuggestions.bind(this),
   minimumCharacters: 1,
   itemRenderer: this.customItemRenderer.bind(this)}
      ]}
  }

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
    this.dataApi.listDocuments(true).then((res) => {
      this.docs = res;
    })
  }

  change(e: ChangeEvent) {
    console.log('CHANGE',{e})
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

  async getSuggestions(queryText: string){
    const searchStrings = queryText.toLowerCase().replace('[','').replace(']','').split('#');
    const docSearchStrings = searchStrings.length === 0 ? [] : searchStrings[0].split(' ');
    // const res = await this.dataApi.listDocuments(true);
    // console.log({res})
    const relevant_docs =  this.docs.filter((doc) => {
      for (let i = 0; i < docSearchStrings.length; i++) {
        if(!doc.name.toLowerCase().includes(docSearchStrings[i])){
          return false;
        }
      }
      return true;
    });
    const suggestions = queryText.includes('#') ? [] : relevant_docs.map((doc) => {
      return {id: `[[${doc.name}]]`, href: environment.BASE_URL+'/doc/'+doc.$id, text: `[[${doc.name}]]`, docName: doc.name, cardContent: ''}
    })
    let promises : Promise<void>[] = [];
      for (let i = 0; i < Math.min(relevant_docs.length,5); i++) {
        const doc = relevant_docs[i];
        if(doc.cardIDs){
          for (let j = 0; j < doc.cardIDs.length; j++) {
            const cardID = doc.cardIDs[j];
            promises.push(new Promise<void>(async (resolve,reject) => {
              this.dataApi.getCard(cardID).then((card) => {
                let shouldIncludeCard = false;
                for (let i = 0; i < searchStrings.length; i++) {
                  if(card.front.toLowerCase().includes(searchStrings[i]) || card.back.toLowerCase().includes(searchStrings[i]) || card.$id.toLowerCase().includes(searchStrings[i])){
                    shouldIncludeCard = true;
                  }
                }
                if(shouldIncludeCard){
                  // const parser = new DOMParser();
                  // const dom = parser.parseFromString(card.front,'text/html');
                  // console.log({dom})
                  // const cardContent = dom.documentElement.textContent || '-';
                  const cardContent = card.front.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/gm,' ') || '-';
                  suggestions.push({id: `[[${doc.name}: Card ${cardContent}]]`,href: environment.BASE_URL+'/doc/'+doc.$id+'#CARD_'+card.$id, text: `[[${doc.name}#${cardID}]]`, docName: doc.name, cardContent: cardContent})
                }
                resolve();
              }).catch((reason) => reject(reason))
            }))
          }
        }
      }
    await Promise.all(promises);
    console.log({suggestions})
    return suggestions;
  
  }

  customItemRenderer(item: {id: string, href: string, text: string, docName: string, cardContent: string}){
    const itemElement = document.createElement( 'span' );

    itemElement.classList.add( 'custom-item' );
    itemElement.id = `mention-list-item-id-${ item.id }`;

    const docNameShort = (item.docName.length > 20) ? (item.docName.substring(0,18) + '...') : (item.docName);
    itemElement.textContent = docNameShort;
    itemElement.style.fontWeight = 'bold';
    itemElement.style.display = 'inline-block';
    
    if(item.cardContent){
      const cardElement = document.createElement( 'span' );
      cardElement.classList.add( 'custom-item-username' );
      const cardContentShort = (item.cardContent.length > 35) ? (item.cardContent.substring(0,33) + '...') : (item.cardContent);
      cardElement.textContent = ': 🗃️ ' + cardContentShort;
      itemElement.appendChild( cardElement );
    }

    return itemElement;
  }

  editorTest(){
    console.log(this.frontEditorComponent);
    this.frontEditorComponent?.editorInstance?.model.change((writer: any) => {
      writer.insertText( 'foo',  this.frontEditorComponent?.editorInstance?.model.document.selection.getLastPosition() );
    })
  }
}
