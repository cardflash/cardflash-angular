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
import { CKEditorComponent } from '@ckeditor/ckeditor5-angular';
import { Annotation } from 'src/app/types/annotation';
import { Card } from 'src/app/types/card';
import * as CustomBalloonEditor from 'src/ckeditor/ckeditor.js';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-editor-flip-card',
  templateUrl: './editor-flip-card.component.html',
  styleUrls: ['./editor-flip-card.component.scss'],
})
export class EditorFlipCardComponent implements OnInit, AfterViewInit {
  FrontEditor: any;
  BackEditor: any;
  @Input('card') public card: Card = {
    localID: '0',
    front: '',
    back: '',
    page: 0,
    hiddenText: '',
    chapter: '',
    title: '',
  };

  @Output('scrollToAnnotation') scrollToAnnotationEvent: EventEmitter<{
    annotation: Annotation;
    where: 'pdf' | 'card' | 'both';
  }> = new EventEmitter<{
    annotation: Annotation;
    where: 'pdf' | 'card' | 'both';
  }>();

  @Output('edit') public editEmitter: EventEmitter<Card> =
    new EventEmitter<Card>();

  @Output('delete') public deleteEmitter: EventEmitter<Card> =
    new EventEmitter<Card>();

  @ViewChildren('annotationHelperFront') annotationHelperFront?: QueryList<
    ElementRef<HTMLDivElement>
  >;
  @ViewChildren('annotationHelperBack') annotationHelperBack?: QueryList<
    ElementRef<HTMLDivElement>
  >;

  @ViewChild('frontEditor') frontEditorComponent?: CKEditorComponent;
  @ViewChild('backEditor') backEditorComponent?: CKEditorComponent;

  public flipped: boolean = false;
  public annotations: Annotation[] = [];
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
      items: ['bold', 'italic', 'highlight', 'underline', 'strikethrough'],
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
      'redo',
    ],
    image: {
      toolbar: [
        'imageTextAlternative',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        'linkImage',
      ],
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells',
        'tableCellProperties',
        'tableProperties',
      ],
    },
    licenseKey: '',
  };

  constructor() {}
  ngAfterViewInit(): void {}

  ngOnInit(): void {
    this.FrontEditor = CustomBalloonEditor;
    this.BackEditor = CustomBalloonEditor;
    this.annotations = [];
    if (this.card.annotations) {
      for (let i = 0; i < this.card.annotations.length; i++) {
        const annot = this.card.annotations[i];
        this.annotations.push(JSON.parse(annot));
      }
    }
    setTimeout(() => this.cardUpdated(), 300);
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
              ref.nativeElement.style.display = 'none';
            } else {
              ref.nativeElement.style.display = 'block';
              ref.nativeElement.style.top =
                rect.top - parentRect.top + 40 + 'px';
              ref.nativeElement.style.left = -10 + 'px';
            }
          }
        }
      });
    }
  }

  cardUpdated() {
    setTimeout(() => {
      const annotations = [];
      if (this.card.annotations) {
        for (let i = 0; i < this.card.annotations.length; i++) {
          const annot = this.card.annotations[i];
          annotations.push(JSON.parse(annot));
        }
      }
      this.annotations = annotations;
      console.log(annotations);
      setTimeout(() => {
        this.addAnnotationHelpers();
      }, 300);
    }, 300);
  }

  async scrollToAnnotation(
    annotation: Annotation,
    where: 'pdf' | 'card' | 'both' = 'card'
  ) {
    this.scrollToAnnotationEvent.emit({ annotation: annotation, where: where });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: any) {
    this.addAnnotationHelpers();
  }

  flipToSideForAnnotation(annotationID: string) {
    if (
      this.frontEditorComponent?.editorInstance &&
      this.backEditorComponent?.editorInstance
    ) {
      const frontSourceEl: HTMLElement =
        this.frontEditorComponent.editorInstance.sourceElement;
      const backSourceEl: HTMLElement =
        this.backEditorComponent.editorInstance.sourceElement;
      const frontEl = frontSourceEl.querySelector(
        '#' + environment.ANNOTATION_ON_CARD_PREFIX + annotationID
      );
      const backEl = backSourceEl.querySelector(
        '#' + environment.ANNOTATION_ON_CARD_PREFIX + annotationID
      );
      if (frontEl && this.flipped) {
        this.flipped = false;
      } else if (backEl && !this.flipped) {
        this.flipped = true;
      }
    }
  }
}
