import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import * as CustomBalloonEditor from 'src/ckeditor/ckeditor.js';
import { environment } from 'src/environments/environment';
import { DataApiService, NoteEntry } from '../data-api.service';
import { UtilsService } from '../utils.service';
@Component({
  selector: 'app-edit-note',
  templateUrl: './edit-note.component.html',
  styleUrls: ['./edit-note.component.scss'],
})
export class EditNoteComponent implements OnInit {
  @ViewChild('editor') editorComponent?: CKEditorComponent;

  public Editor: any;

  @Input('activeSide') activeSide: string = '';


  @Input('note') note?: NoteEntry;
  private tempStyles: HTMLStyleElement | undefined;


  private notes: NoteEntry[] = [];
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
  constructor(public utils: UtilsService, private dataApi: DataApiService, private actRoute: ActivatedRoute) {}

  async ngOnInit() {
    this.Editor = CustomBalloonEditor;
    if(!this.note){
      this.note = await this.dataApi.getNote(this.actRoute.snapshot.params.id);
    }
    this.dataApi.listNotes(true).then((notes) => {
      this.notes = notes;
    })
    // setInterval(() => {
    //   this.addTempStyles();
    // }, 500);
  }

  editorTest() {
    this.addTempStyles();
    if (this.editorComponent && this.editorComponent.editorInstance) {
      console.log(this.editorComponent);
      setTimeout(() => {
        if (this.editorComponent?.editorInstance) {
          this.editorComponent.editorInstance.model.change((writer: any) => {
            if (this.editorComponent && this.editorComponent.editorInstance) {
              const els = Array.from(
                this.editorComponent.editorInstance.model.document.getRoot().getChildren()
              );
              const admonitions = els.filter((el: any) => {
                console.log(el);
                return el.name === 'admonition';
              });
              if (admonitions.length > 0) {
                const admonition: any =
                  getRelatedAdmonition(
                    this.editorComponent.editorInstance.model.document.selection
                  ) || admonitions[admonitions.length - 1];
                const admonition_title = admonition.getChild(0);
                const admonition_content = admonition.getChild(1);
                console.log({ admonition });
                writer.setAttribute('data-test', 'test123', admonition);
                this.editorComponent.editorInstance.model;
                writer.insertText(
                  'foo',
                  this.activeSide === 'front'
                    ? admonition_title.getChild(0)
                    : admonition_content.getChild(0),
                  'end'
                );
              }
            }
          });
        }
      }, 10);
    }
  }

  addTempStyles() {
    if (!this.tempStyles) {
      this.tempStyles = document.createElement('style');
      document.head.append(this.tempStyles);
    }
    if (this.editorComponent && this.editorComponent.editorInstance) {
      const els = Array.from(
        this.editorComponent.editorInstance.model.document.getRoot().getChildren()
      );
      const admonitions = els.filter((el: any) => {
        console.log(el);
        return el.name === 'admonition';
      });
      if (admonitions.length > 0) {
        const admonition: any =
          getRelatedAdmonition(this.editorComponent.editorInstance.model.document.selection) ||
          admonitions[admonitions.length - 1];
        const admonition_title = admonition.getChild(0);
        const admonition_content = admonition.getChild(1);
        this.tempStyles.textContent = `#${admonition.getAttribute('id')} ${
          this.activeSide === 'front' ? '.admonition-title' : '.admonition-content'
        } {
                  box-shadow: 0px 0px 7px 6px rgb(112, 215, 255);}`;

        // this.activeSide === 'front' ? admonition_title.getChild(0) : admonition_content.getChild(0),
      }
    }
  }

  addAnnotation(annotation: string) {
    if (this.editorComponent && this.editorComponent.editorInstance) {
      const els = Array.from(
        this.editorComponent.editorInstance.model.document.getRoot().getChildren()
      );
      const admonitions = els.filter((el: any) => {
        console.log(el);
        return el.name === 'admonition';
      });
      if(admonitions.length === 0){
        this.newCard();
        this.addAnnotation(annotation);
        return;
      }
      if (admonitions.length > 0) {
        const admonition: any =
          getRelatedAdmonition(this.editorComponent.editorInstance.model.document.selection) ||
          admonitions[admonitions.length - 1];
        const admonition_title = admonition.getChild(0);
        const admonition_content = admonition.getChild(1);
        const viewFragment = this.editorComponent?.editorInstance.data.processor.toView(annotation);
        const modelFragment = this.editorComponent?.editorInstance.data.toModel(viewFragment);
        this.editorComponent?.editorInstance.model.change((writer: any) => {
          if (this.editorComponent && this.editorComponent.editorInstance) {
            this.editorComponent?.editorInstance.model.insertContent(
              modelFragment,
              writer.createPositionAt(
                this.activeSide === 'front' ? admonition_title.getChild(0) : admonition_content.getChild(0),
                'end'
              )
            );
          }
        });
      }
    }
  }

  newCard(){
    if (this.editorComponent && this.editorComponent.editorInstance) {
      console.log(this.editorComponent);
      // this.editorComponent.editorInstance.model.change((writer: any) => {
      //   writer.insertElement('admonition',[],document.)
      // })
      // this.editorComponent.editorInstance.g
      this.editorComponent.editorInstance.execute('insertAdmonition',{value: 'help'})
      // this.editorComponent.editorInstance.execute('enter',)
      this.editorComponent?.editorInstance.model.change((writer: any) => {
        if (this.editorComponent && this.editorComponent.editorInstance) {
          writer.insertElement(
            'paragraph',
            writer.createPositionAt(
              this.editorComponent.editorInstance.model.document.selection.getLastPosition(),
              'after'
            )
          );
        }
      });
    }
  }

  async save(){
    if(this.note){
      await this.dataApi.updateNote(this.note.$id,this.note)
    }
  }
  async change(){
   this.save();
  }

  async getSuggestions(queryText: string){
    const searchStrings = queryText.toLowerCase().replace('[','').replace(']','').split('#');
    const docSearchStrings = searchStrings.length === 0 ? [] : searchStrings[0].split(' ');
    // const res = await this.dataApi.listDocuments(true);
    // console.log({res})
    const relevant_docs =  this.notes.filter((doc) => {
      for (let i = 0; i < docSearchStrings.length; i++) {
        if(!doc.title.toLowerCase().includes(docSearchStrings[i])){
          return false;
        }
      }
      return true;
    });
    const suggestions = queryText.includes('#') ? [] : relevant_docs.map((doc) => {
      return {id: `[[${doc.title}]]`, href: environment.BASE_URL+'/notes/'+doc.$id, text: `[[${doc.title}]]`, docName: doc.title, cardContent: ''}
    })
    // let promises : Promise<void>[] = [];
    // await Promise.all(promises);
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
}

export function getRelatedAdmonition(selection: any) {
  const viewElement = selection.getSelectedElement();
  if (viewElement) {
    if (viewElement.name === 'admonition-title') {
      return viewElement;
    } else {
      return null;
    }
  }

  let parent = selection.getFirstPosition().parent;
  while (parent) {
    if (parent.is('element') && 'name' in parent && parent.name === 'admonition') {
      return parent;
    } else if ('hasClass' in parent && parent.hasClass('admonition-title')) {
      return parent;
    }
    parent = parent.parent;
  }

  return null;
}
