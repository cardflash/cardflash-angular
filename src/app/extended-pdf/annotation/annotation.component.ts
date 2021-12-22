import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Annotation } from '../../types/annotation';
import { environment } from '../../../environments/environment';
import { TextJustification } from 'annotpdf';
import { UtilsService } from 'src/app/utils.service';
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

  public line: any;

  public mouseOver: boolean = false;

  constructor(private utils: UtilsService) {}

  ngOnInit(): void {}

  getAnnotationOnCardPrefix() {
    return environment.ANNOTATION_ON_CARD_PREFIX;
  }

  clicked() {
    this.showInDocument.emit(this.annotation?.id);
    this.removeLine();
      setTimeout(() => {
        if (this.mouseOver) {
          this.showLine();
        }
      },200)
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

  showLine() {
    this.removeLine();
    if (this.utils.isIDInView(environment.ANNOTATION_JMP_PREFIX + this.annotation?.id)) {
      this.line = this.utils.createLineBetweenIds(
        environment.ANNOTATION_ON_CARD_PREFIX + this.annotation?.id,
        environment.ANNOTATION_JMP_PREFIX + this.annotation?.id,
        this.annotation?.color
      );
    }
  }

  removeLine() {
    if (this.line) {
      this.line.remove();
      this.line = null;
    }
  }
}
