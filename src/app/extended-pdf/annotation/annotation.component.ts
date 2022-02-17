import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Annotation } from '../../types/annotation';
import { environment } from '../../../environments/environment';
import { UtilsService } from 'src/app/utils.service';
import { DataApiService } from 'src/app/data-api.service';
@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
})
export class AnnotationComponent implements OnInit, OnDestroy {
  @Input('annotation')
  public annotation: Annotation | undefined;

  @Input('documentID')
  public documentID: string | undefined;

  @Output('updateAnnotation')
  public updateAnnotation: EventEmitter<Annotation> = new EventEmitter<Annotation>();

  @Output('showInDocument')
  public showInDocument: EventEmitter<string> = new EventEmitter<string>();

  @Output('deleteAnnotation')
  public deleteAnnotation: EventEmitter<Annotation> = new EventEmitter<Annotation>();

  @ViewChild('annotationOuterWrapper')
  public annotationOuterWrapper: ElementRef<HTMLDivElement> | undefined;

  public line: any;

  public mouseOver: boolean = false;

  public isEditing: boolean = false;
  public imgSrc: string | null = null;
  constructor(public utils: UtilsService, public dataApi: DataApiService) {}

  ngOnInit(): void {
    if (this.annotation?.imgID) {
      this.imgSrc = this.dataApi.getFileView(this.annotation.imgID).href;
    }
  }

  ngOnDestroy(): void {
    this.removeLine();
  }

  getAnnotationOnCardPrefix() {
    return environment.ANNOTATION_ELEMENT_PREFIX;
  }

  clicked() {
    if (!this.isEditing) {
      this.showInDocument.emit(this.annotation?.id);
      setTimeout(() => {
        this.removeLine();
        if (this.mouseOver) {
          this.showLine();
        }
      }, 200);
    }
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
    if (this.isEditing) return;
    if (this.utils.isIDInView(environment.ANNOTATION_JMP_PREFIX + this.annotation?.id)) {
      this.line = this.utils.createLineBetweenIds(
        environment.ANNOTATION_ELEMENT_PREFIX + this.annotation?.id,
        environment.ANNOTATION_JMP_PREFIX + this.annotation?.id,
        this.annotation?.color,
        10,
        true,
        true
      );
    }
  }

  removeLine() {
    if (this.line) {
      this.line.remove();
      this.line = null;
    }
  }

  changeAnnotationColor(newColor: string) {
    if (this.annotation) {
      this.annotation.color = newColor;
      this.updateAnnotation.emit(this.annotation);
    }
  }

  addNewComment() {
    if (this.annotation) {
      this.annotation.comment = 'My comment';
    }
  }

  toggleEdit(){
    if(this.isEditing){
      if (this.annotation) {
        this.updateAnnotation.emit(this.annotation);
      }
    }
    this.isEditing = !this.isEditing;
  }

  dragStart(e: DragEvent) {
    if (this.annotation && this.documentID && !this.isEditing) {
      const reference = this.utils.generateReferenceFromAnnotation(this.annotation,this.documentID)
      e.dataTransfer?.setData('text/html', reference);
    }
  }
}
