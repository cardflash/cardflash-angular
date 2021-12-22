import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Annotation } from '../../types/annotation';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
})
export class AnnotationComponent implements OnInit {
  @Input('annotation')
  public annotation: Annotation | undefined;

  @Output('showInDocument')
  public showInDocument: EventEmitter<string> = new EventEmitter<string>();

  @ViewChild('annotationOuterWrapper')
  public annotationOuterWrapper: ElementRef<HTMLDivElement> | undefined;
  constructor() {}

  ngOnInit(): void {}

  getAnnotationOnCardPrefix() {
    return environment.ANNOTATION_ON_CARD_PREFIX;
  }

  highlightAnnotation() {
    if (this.annotationOuterWrapper) {
      this.annotationOuterWrapper.nativeElement.classList.add('highlight');
      const timeout = setTimeout(() => {
        if (this.annotationOuterWrapper) {
          this.annotationOuterWrapper.nativeElement.classList.remove('highlight');
        }
        clearTimeout(timeout);
      }, 1000);
    }
  }
}
