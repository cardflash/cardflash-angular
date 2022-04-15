import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import * as CustomBalloonEditor from 'src/ckeditor/ckeditor.js';
import { environment } from 'src/environments/environment';
import { v4 } from 'uuid';
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
    extraPlugins: [
      function MentionLinks(editor: any) {
        // The upcast converter will convert a view
        //
        //		<a href="..." class="mention" data-mention="...">...</a>
        //
        // element to the model "mention" text attribute.
        editor.conversion.for('upcast').elementToAttribute({
          view: {
            name: 'a',
            key: 'data-mention',
            classes: 'mention',
            attributes: {
              href: true,
            },
          },
          model: {
            key: 'mention',
            value: (viewItem: any) => {console.log({viewItem}); return editor.plugins.get('Mention').toMentionAttribute(viewItem)},
          },
          converterPriority: 'high',
        });

        // Downcast the model "mention" text attribute to a view
        //
        //		<a href="..." class="mention" data-mention="...">...</a>
        //
        // element.
        editor.conversion.for('downcast').attributeToElement({
          model: 'mention',
          view: (modelAttributeValue: any, { writer }: any) => {
            // Do not convert empty attributes (lack of value means no mention).
            if (!modelAttributeValue) {
              return;
              // let item = writer.createAttributeElement('br',{style: 'display: none', 'hidden': true},{priority: 5});
              // return item;
            }
            let href;
            if(modelAttributeValue.id.indexOf('/') === 0){
              const command = modelAttributeValue.id;
              modelAttributeValue.id = '';
              console.log('exec' + modelAttributeValue.id);
              let item = writer.createAttributeElement('none',{style: 'display: none', 'hidden': true},{priority: 5});
              
              setTimeout(() => {
                switch (command) {
                  case '/admonition':
                    editor.execute('delete');
                    editor.execute('insertAdmonition',{value: 'help'});
                    
                    break;
                    case '/title':
                      editor.model.change((writer : any) => {
                        const title = writer.createElement('heading1',{});
                        // writer.appendText('Title',{},title)
                        editor.execute( 'heading', { value: 'heading1' } );
                        return title;
                        // editor.model.insertContent(title,editor.model.document.selection.getLastPosition(),'after');
                      })
                      break;
                    case '/diagram':
                      editor.execute("insertDiagram");
                      editor.execute("editDiagram");
                      break;
                    case '/bulleted-list':
                      editor.execute("bulletedList");
                      break;
                    case '/numbered-list':
                      editor.execute("numberedList")
                      break;
                    case '/highlight':
                      editor.execute('delete');
                      editor.execute("highlight", { value: 'lightBlueMarker' });
                      break;
                    case '/link':
                      editor.execute("link",environment.BASE_URL)
                      break;
                    case '/bold':
                      editor.execute('delete');
                      editor.execute("bold",environment.BASE_URL)
                      break;
                    case '/wiki-link':
                      editor.execute("mention",{marker: '[', mention: '[['});
                      break;
                    case '/math':
                      editor.plugins.get('MathUI')._showUI();
                      console.log({editor});
                      break;
                    case '/embed-html':
                      // editor.execute('htmlEmbed','<b>Hello World</b>');
                      editor.execute( 'htmlEmbed' );
                      editor.editing.view.focus();
              
                      const widgetWrapper = editor.editing.view.document.selection.getSelectedElement();
                      widgetWrapper.getCustomProperty( 'rawHtmlApi' ).makeEditable();
                      break;
                    default:
                        break;
                      }
                    },0);
              return item;
            }else if(modelAttributeValue.id.indexOf('[') === 0){
              if (modelAttributeValue.href) {
                href = modelAttributeValue.href;
              } else {
                href =
                  environment.BASE_URL +
                  '/notes/' +
                  modelAttributeValue.id.replace('[[', '').replace(']]', '');
              }
  
              return writer.createAttributeElement(
                'a',
                {
                  class: 'mention',
                  'data-mention': modelAttributeValue.id,
                  href,
                },
                {
                  // Make mention attribute to be wrapped by other attribute elements.
                  priority: 20,
                  // Prevent merging mentions together.
                  id: modelAttributeValue.uid,
                }
              );

            }else if(modelAttributeValue.id.indexOf(':') === 0){
              console.log({modelAttributeValue})
              return;
            }else{
              let item = writer.createAttributeElement('none',{style: 'display: none', 'hidden': true},{priority: 5});
              // setTimeout(() => {
              //   editor.execute('delete');
              // },1)
              return item;
              // return null;
            }
          },
          converterPriority: 'high',
        });
      },
    ],
    mention: {
      feeds: [
        {
          marker: '[',
          feed: this.getSuggestions.bind(this),
          minimumCharacters: 1,
          itemRenderer: this.customItemRenderer.bind(this),
        },
        {
          marker: '/',
          feed: this.getCommandSuggestions.bind(this),
          minimumCharacters: 0,
          itemRenderer: this.customCommandRenderer.bind(this)
        },
        {marker: ':',
        feed: [
          {id: ':sunglasses: 😎', text: '😎'},
          {id: ':smiley: 😀', text: '😀'},
          {id: ':heart-face: 🥰', text: '🥰'},
          {id: ':hugging: 🤗', text: '🤗'},
          {id: ':laughing: 😂', text: '😂'},
          {id: ':heart: ❤️', text: '❤️'},
          {id: ':thumbs-up: 👍', text: '👍'},
          {id: ':thumbs-down: 👎', text: '👎'},
          {id: ':brain: 🧠', text: '🧠'},
          {id: ':watermelon: 🍉', text: '🍉'},
          {id: ':peach: 🍑', text: '🍑'},
          {id: ':star: ⭐', text: '⭐'},
          {id: ':rainbow: 🌈', text: '🌈'},
          {id: ':lightning: ⚡', text: '⚡'},
          {id: ':fire: 🔥', text: '🔥'},
        ]
        }
      ],
    },
  };
  constructor(
    public utils: UtilsService,
    private dataApi: DataApiService,
    private actRoute: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.Editor = CustomBalloonEditor;
    if (!this.note) {
      this.note = await this.dataApi.getNote(this.actRoute.snapshot.params.id);
    }
    this.dataApi.listNotes(true).then((notes) => {
      this.notes = notes;
    });
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
      if (admonitions.length === 0) {
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
                this.activeSide === 'front'
                  ? admonition_title.getChild(0)
                  : admonition_content.getChild(0),
                'end'
              )
            );
          }
        });
      }
    }
  }

  newCard() {
    if (this.editorComponent && this.editorComponent.editorInstance) {
      console.log(this.editorComponent);
      // this.editorComponent.editorInstance.model.change((writer: any) => {
      //   writer.insertElement('admonition',[],document.)
      // })
      // this.editorComponent.editorInstance.g
      this.editorComponent.editorInstance.execute('insertAdmonition', { value: 'help' });
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

  async save() {
    if (this.note) {
      await this.dataApi.updateNote(this.note.$id, this.note);
    }
  }
  async change() {
    this.save();
  }

  async getSuggestions(queryText: string) {
    const searchStrings = queryText.toLowerCase().replace('[', '').replace(']', '').split('#');
    const docSearchStrings = searchStrings.length === 0 ? [] : searchStrings[0].split(' ');
    // const res = await this.dataApi.listDocuments(true);
    // console.log({res})
    const relevant_docs = this.notes.filter((doc) => {
      for (let i = 0; i < docSearchStrings.length; i++) {
        if (!doc.title.toLowerCase().includes(docSearchStrings[i])) {
          return false;
        }
      }
      return true;
    });
    const suggestions = queryText.includes('#')
      ? []
      : relevant_docs.map((doc) => {
          return {
            id: `[[${doc.$id}]]`,
            href: environment.BASE_URL + '/notes/' + doc.$id,
            text: `[[${doc.title}]]`,
            docName: doc.title,
            cardContent: '',
            isNew: false,
          };
        });
    if (queryText.length >= 2 && !queryText.includes(']')) {
      suggestions.push({
        id: `[[${queryText.replace('[', '')}]]`,
        text: `[[${queryText.replace('[', '')}]]`,
        docName: queryText.replace('[', ''),
        cardContent: '',
        isNew: true,
        href: environment.BASE_URL + '/notes',
      });
    }
    // let promises : Promise<void>[] = [];
    // await Promise.all(promises);
    console.log({ suggestions });
    return suggestions;
  }

  customItemRenderer(item: {
    id: string;
    href: string;
    text: string;
    docName: string;
    cardContent: string;
    isNew: boolean;
  }) {
    const itemElement = document.createElement('span');

    itemElement.classList.add('custom-item');
    itemElement.id = `mention-list-item-id-${item.id}`;

    const docNameShort =
      item.docName.length > 20 ? item.docName.substring(0, 18) + '...' : item.docName;
    itemElement.textContent = docNameShort;
    if (item.isNew) {
      itemElement.textContent += ' (create new)';
    }
    itemElement.style.fontWeight = 'bold';
    itemElement.style.display = 'inline-block';

    if (item.cardContent) {
      const cardElement = document.createElement('span');
      cardElement.classList.add('custom-item-username');
      const cardContentShort =
        item.cardContent.length > 35 ? item.cardContent.substring(0, 33) + '...' : item.cardContent;
      cardElement.textContent = ': 🗃️ ' + cardContentShort;
      itemElement.appendChild(cardElement);
    }

    return itemElement;
  }

  async getCommandSuggestions(queryText: string) {
    if(queryText.includes(' ')){
      return [];
    }
    console.log({queryText});
    const allCommands = [
    //   {
    //   id: `/bold`,
    //   commandName: `Toggle bold`,
    //   text: ' ',
    //   type: 'command',
    //   icon: 'format_bold'
    // },
    {
      id: `/wiki-link`,
      commandName: `Reference another note`,
      text: ' ',
      type: 'command',
      icon: 'add_link'
    },
    {
      id: `/math`,
      commandName: `Insert math expression (LaTeX)`,
      text: ' ',
      type: 'command',
      icon: 'attach_money'
    },
    {
      id: `/highlight`,
      commandName: `Create highlight`,
      text: ' ',
      type: 'command',
      icon: 'color_lens'
    },
    {
      id: `/title`,
      commandName: `Insert title (header)`,
      text: ' ',
      type: 'command',
      icon: 'title'
    },
    {
      id: `/diagram`,
      commandName: `Insert diagram`,
      text: ' ',
      type: 'command',
      icon: 'mediation'
    },
    {
      id: `/admonition`,
      commandName: `Insert admonition`,
      text: ' ',
      type: 'command',
      icon: 'info'
    },
    {
      id: `/bulleted-list`,
      commandName: `Insert bulleted list`,
      text: ' ',
      type: 'command',
      icon: 'format_list_bulleted'
    },
    {
      id: `/numbered-list`,
      commandName: `Insert numbered list`,
      text: ' ',
      type: 'command',
      icon: 'format_list_numbered'
    },
    {
      id: `/embed-html`,
      commandName: `Embed HTML`,
      text: ' ',
      type: 'command',
      icon: 'raw_on'
    },
    {
      id: `/link`,
      commandName: `Add a link`,
      text: ' ',
      type: 'command',
      icon: 'link'
    }
  ];
    return allCommands.filter((command) => command.commandName.toLowerCase().includes(queryText.toLowerCase()));
  }
  

  customCommandRenderer(item: {
    id: string;
    text: string;
    commandName: string;
    icon: string;
  }) {
    // <i class="material-icons">image</i>
    const iconEl = document.createElement('i');
    iconEl.classList.add('material-icons')
    iconEl.textContent = item.icon;
    iconEl.style.fontFamily = '"Material Icons"';
    iconEl.style.fontSize = '1.5rem';

    const itemElement = document.createElement('span');
    itemElement.style.display = 'inline-flex';
    itemElement.style.justifyContent = 'space-between';
    itemElement.style.alignItems = 'center';
    itemElement.style.minWidth = '15rem';
    // itemElement.style.paddingRight = '4rem';
    itemElement.id = `mention-list-item-id-${item.id}`;
    itemElement.classList.add('command-item-element');
    const itemLabel = document.createElement('span');
    
    // itemElement.classList.add('command-item');
    
    // itemLabel.style.fontWeight = 'bold';
    itemLabel.style.fontSize = '1.1rem';
    itemLabel.style.width = '100%';
    // itemLabel.style.textAlign = 'center';
    itemLabel.style.marginLeft = '1rem';
    itemLabel.textContent = item.commandName;
    itemElement.appendChild(iconEl);
    itemElement.appendChild(itemLabel);
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
