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
import { DomSanitizer } from '@angular/platform-browser';
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
  public imgSrc: string | undefined = undefined;

  public referenceText: string = '';

  public isTouchDevice: boolean = false;
  constructor(public utils: UtilsService, public dataApi: DataApiService,public sanitizer: DomSanitizer) {}

  async ngOnInit() {
    if (this.annotation?.imgID) {
      this.imgSrc = (await this.dataApi.getFileView(this.annotation.imgID)).href;
    }

    this.referenceText = await this.getReference();
    this.updateAnnotation.subscribe(async () => {
      this.referenceText = await this.getReference();
    })


    this.isTouchDevice = window.matchMedia('(any-hover: none)').matches;
  
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
    // alert('removing line');
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

  async getReference(){
    if(this.annotation){
      return await this.utils.generateReferenceFromAnnotation(this.annotation,this.documentID,this.imgSrc)
    }else{
      return '';
    }
  }

  async copy(){
    const reference =this.referenceText;
    let useFallback = !navigator.clipboard;

    if (navigator.clipboard){
      try{
        const type = "text/html";
        const blob = new Blob([reference], { type });
        const data = [new ClipboardItem({ [type]: blob })];
    
        await navigator.clipboard.write(data)
        useFallback = false;
        }catch(e){
          console.log('clipboard items not supported',e)
          useFallback = true;
        }
      }

      if(useFallback){

        function listener(e: ClipboardEvent) {
          if(e.clipboardData){
            e.clipboardData.setData("text/html", reference);
            e.clipboardData.setData("text/plain", reference);
            e.preventDefault();
          }
        }
        document.addEventListener("copy", listener);
        document.execCommand("copy");
        document.removeEventListener("copy", listener);
      }

  }

  async dragStart(e: DragEvent) {
    console.log({e})
    if (this.annotation && !this.isEditing) {
      const reference = this.referenceText;
      e.dataTransfer?.setData('text/html', reference);
    }
  }

  handleMouseEnter(){
    if(!this.isTouchDevice){
      this.mouseOver = true;
      this.showLine();
    }
  }
}
