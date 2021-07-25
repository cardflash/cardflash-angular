import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import * as CustomBalloonEditor from 'src/ckeditor/ckeditor.js';

@Component({
  selector: 'app-card-side',
  templateUrl: './card-side.component.html',
  styleUrls: ['./card-side.component.scss']
})
export class CardSideComponent implements OnInit {

  public readonly EDITOR_CONFIG= {  toolbar: {
    items: [
      'bold',
      'italic',
      'underline',
      'fontColor',
      'link',
      'highlight',
      '-'
    ],
    shouldNotGroupWhenFull: true
  },
  language: 'en',
  blockToolbar: [
    'heading',
    'bulletedList',
    'numberedList',
    'subscript',
    'superscript',
    'specialCharacters',
    'blockQuote',
    'horizontalLine',
    'mediaEmbed',
    'insertTable',
    'codeBlock',
    'htmlEmbed',
    'findAndReplace',
    'restrictedEditingException'
  ],
  image: {
    toolbar: [
      'imageTextAlternative',
      'imageStyle:inline',
      'imageStyle:block',
      'imageStyle:side'
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

  public Editor : any; 
  @Input('highlighted') public highlighted: boolean = false;
  
  @ViewChild('editor') editor?: CKEditorComponent;

  
  @Input('name') public name: string = "";
  
  @Input('content') public content: string = "";
  @Output('contentChange') contentChange: EventEmitter<string> = new EventEmitter<string>();
  
  constructor() { }

  ngOnInit(): void {
    this.Editor = CustomBalloonEditor;
  }

  onChange(){
    this.contentChange.emit(this.content);
  }

}
