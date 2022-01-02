import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { imgSrcToBlob } from 'blob-util';
import { customAlphabet } from 'nanoid';
import { IPDFViewerApplication, PageRenderedEvent } from 'ngx-extended-pdf-viewer';
import { environment } from 'src/environments/environment';
import { DataService } from '../data.service';
import { DocumentService } from '../document.service';
import { Annotation } from '../types/annotation';
import { PDFDocument } from '../types/pdf-document';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-extended-pdf',
  templateUrl: './extended-pdf.component.html',
  styleUrls: ['./extended-pdf.component.scss'],
})
export class ExtendedPdfComponent implements OnInit, AfterViewInit {
  public currPageNumber: number = 1;
  public pdfSrc: string = '/assets/pdfs/flashcards_siter_eu.pdf';
  public frontSelected: boolean = true;

  private pdfCanvContext: CanvasRenderingContext2D[] = [];

  public selectionInsertTypes: ['h1', 'h2', 'normal', 'small'] = ['h1', 'h2', 'normal', 'small'];

  public selectionInsertType: 'small' | 'normal' | 'h1' | 'h2' = 'normal';

  @Output('annotations')
  public annotationForPage: Map<number, Annotation[]> = new Map<number, Annotation[]>();

  private readonly nanoid = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    10
  );

  @Output('annotationAdded')
  public annotationAdded: EventEmitter<Annotation> = new EventEmitter<Annotation>();

  public selectionTimeout: NodeJS.Timeout | undefined = undefined;

  @ViewChild('selectionTools')
  private selectionTools?: ElementRef<HTMLDivElement>;

  @ViewChild('areaSelection')
  public areaSelection: ElementRef<HTMLDivElement> | undefined;

  @ViewChild('previewCanvas')
  private previewCanvas?: ElementRef<HTMLCanvasElement>;

  private previewContext?: CanvasRenderingContext2D;
  public rect: { x1: number; y1: number; x2: number; y2: number } = { x1: 0, y1: 0, x2: 0, y2: 0 };

  public doingAreaSelection: boolean = false;

  public scale: number = 1;

  public document: PDFDocument | undefined;
  public documentid: string | undefined;

  constructor(public utils: UtilsService, private dataService: DataService, private actRoute: ActivatedRoute, private documentService: DocumentService) {this.documentid = actRoute.snapshot.params.id;}

  public currentLeaderLines : Map<string,any> = new Map<string,any>();
  public currentLineDrawerInterval: NodeJS.Timeout | undefined;


  ngOnInit(): void {
    if (this.documentid) {
      this.dataService.getOnlineDocument('documents',this.documentid).then((res) => {
        console.log({res});
        this.document = res;
        this.loadFromDoc(res);
      })
    }
  }

  async ngAfterViewInit() {
    this.scale = window.devicePixelRatio;
    const previewContext = this.previewCanvas?.nativeElement.getContext('2d');
    if (previewContext) {
      this.previewContext = previewContext;
    }
    document.addEventListener('selectionchange', () => this.onSelect());

    this.currentLineDrawerInterval = setInterval(() => {
      for(const l of this.currentLeaderLines.values()){
        l.position();
      }
    }, 5);
  }

  loadFromDoc(doc: PDFDocument) {
      if (doc) {
        this.document = doc;
        if (this.document.cards) {
        }
        if (this.document && this.document.annotations) {
          for (let i = 0; i < this.document.annotations.length; i++) {
            const annotJSON = this.document.annotations[i];
            let annot: Annotation = JSON.parse(annotJSON);
            if (this.annotationForPage.has(annot.page)) {
              const forPage = this.annotationForPage.get(annot.page);
              forPage!.push(annot);
            } else {
              this.annotationForPage.set(annot.page, [annot]);
            }
          }
        }
        const src = this.dataService.getFileView(this.document?.fileid).href;
        this.pdfSrc = src;
    }
  }

  getAllAnnotations() {
    let allAnnotations: Annotation[] = [];
    this.annotationForPage.forEach((val) => (allAnnotations = allAnnotations.concat(val)));
    console.log({ allAnnotations });
    return allAnnotations;
  }

  pagesLoadComplete(e: any) {
    console.log('pagesLoadComplete');
  }

  onSelect() {
    const sel: Selection | null = document.getSelection();
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }
    if (sel && sel.focusNode) {
      if (
        (<Element>sel.focusNode).parentElement?.parentElement?.className == 'textLayer' ||
        (<Element>sel.focusNode).parentElement?.parentElement?.parentElement?.className ==
          'textLayer'
      ) {
        const span = (<Element>sel.focusNode).parentElement;
        if (sel.toString() != '' && this.selectionTools && span && span.nodeName == 'SPAN') {
          this.selectionTools.nativeElement.style.display = 'none';
          this.selectionTimeout = setTimeout(() => {
            if (this.selectionTools) {
              const bounds = this.calcBoundsOfSelection();
              console.log({ bounds });
              if (bounds) {
                this.selectionTools.nativeElement.style.display = 'block';
                this.selectionTools.nativeElement.style.top = bounds.top - 50 + 'px';
                // 100px is around half of the width of the complete
                // try to position the toolbar in the middle on top of the selected text
                this.selectionTools.nativeElement.style.left =
                  bounds.left - 100 + (bounds.right - bounds.left) / 2 + 'px';
              }
            }
          }, 700);
        }
      } else if (this.selectionTools) {
        this.selectionTools.nativeElement.style.display = 'none';
      }
    }
  }

  pdfLoaded(e: any) {}

  pdfLoadFailed(e: any) {}

  pageRendered(e: PageRenderedEvent) {
    let pdfCanv: HTMLCanvasElement = e.source.canvas;
    e.source.div.oncontextmenu = (event: any) => this.contextMenuOnPage(event, e.source.div);
    if (this.pdfCanvContext) {
      console.log({ e });
      const pageCanvContext = pdfCanv.getContext('2d');
      if (pageCanvContext) {
        const dpr = window.devicePixelRatio || 1;
        pageCanvContext.scale(dpr, dpr);
        this.pdfCanvContext[e.pageNumber] = pageCanvContext;
        this.drawAnnotationsOnPage(e.pageNumber);
        this.calcScaling();
      }
    }
  }

  textLayerRendered(e: any) {}

  calcScaling() {}

  contextMenuOnPage(e: MouseEvent, pageEl: HTMLDivElement) {
    if (!this.getSelection()) {
      console.log('contextMenuOnPage', { e }, { pageEl });
      e.preventDefault();
      this.rect.x1 = e.x;
      this.rect.y1 = e.y;
      this.rect.x2 = e.x;
      this.rect.y2 = e.y;

      pageEl.onmouseup = (event: any) => this.mouseUpOnPage(event, pageEl);
      pageEl.onmousemove = (event: any) => this.mouseMoveOnPage(event, pageEl);
    }
  }

  mouseMoveOnPage(e: MouseEvent, pageEl: HTMLDivElement) {
    this.rect.x2 = e.x;
    this.rect.y2 = e.y;
  }

  mouseUpOnPage(e: MouseEvent, pageEl: HTMLDivElement | null) {
    console.log('mouseUpOnPage', { e }, { pageEl });
    if (pageEl && pageEl.removeAllListeners) {
      console.log('REMOVING ALL LISTENERS');
      pageEl.removeAllListeners('mousemove');
      pageEl.removeAllListeners('mouseup');
    }
    this.addAreaSelection(this.rect);
    console.log('Area selection ended: ', this.rect);
    this.rect.x1 = 0;
    this.rect.y1 = 0;
    this.rect.x2 = 0;
    this.rect.y2 = 0;
  }

  async addAreaSelection(rect: { x1: number; x2: number; y1: number; y2: number }) {
    const x_min = this.getMin(rect.x1, rect.x2);
    const y_min = this.getMin(rect.y1, rect.y2);
    const x_max = this.getMax(rect.x1, rect.x2);
    const y_max = this.getMax(rect.y1, rect.y2);
    const pdfPoint = this.getPDFPoint({
      left: x_min,
      right: x_max,
      top: y_min,
      bottom: y_max,
    });
    if (pdfPoint) {
      let page = this.currPageNumber;
      let pageDetected = this.getPageNumberFromPoint(rect.x1, rect.y1);
      if (pageDetected) {
        page = pageDetected;
      }
      const imgSrc = this.getImageFromSelection(rect, page);

      const annotations = this.annotationForPage.get(page) || [];
      const id = this.nanoid();
      const newAnnotation = {
        id: id,
        type: 'area',
        color: '#ffa62170',
        points: [pdfPoint],
        page: page,
        imgSrc: imgSrc,
      };
      if(imgSrc){
      const blob: Blob = await imgSrcToBlob(imgSrc);
        this.dataService.saveImage(
          new File([blob], this.documentid + '_' + id + '.png')
        ).then((uploadedImageId) => {
          newAnnotation.imgSrc = this.dataService.getFileView(uploadedImageId).toString();
          this.saveDocument();
        } )
    }
      annotations.push(newAnnotation);
      this.annotationForPage.set(page, annotations);
      this.drawAnnotationOnPage(page, newAnnotation);
      this.saveDocument();
    }
  }

  getImageFromSelection(
    rect: { x1: number; x2: number; y1: number; y2: number },
    pageNumber: number
  ): string | undefined {
    const page = this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1];
    const canvasRect = (page.canvas as HTMLCanvasElement).getBoundingClientRect();
    const context: CanvasRenderingContext2D = page.canvas.getContext('2d');
    const x = this.getMin(rect.x1, rect.x2) - canvasRect.left;
    const y = this.getMin(rect.y1, rect.y2) - canvasRect.top;
    const width = this.getAbs(rect.x1 - rect.x2);
    const height = this.getAbs(rect.y1 - rect.y2);

    const data = context.getImageData(
      x * this.scale,
      y * this.scale,
      width * this.scale,
      height * this.scale
    );
    if (this.previewCanvas && this.previewContext) {
      this.previewCanvas.nativeElement.width = width * this.scale;
      this.previewCanvas.nativeElement.height = height * this.scale;
      this.previewContext.putImageData(data, 0, 0);
      return this.previewCanvas.nativeElement.toDataURL();
    } else {
      return undefined;
    }
  }

  drawAnnotationsOnPage(pageNumber: number) {
    const annotations = this.annotationForPage.get(pageNumber);
    if (annotations) {
      annotations.forEach((annotation) => {
        this.drawAnnotationOnPage(pageNumber, annotation);
      });
    }
  }

  getMin(a: number, b: number) {
    return Math.min(a, b);
  }

  getMax(a: number, b: number) {
    return Math.max(a, b);
  }

  getAbs(a: number) {
    return Math.abs(a);
  }

  getPageNumberFromPoint(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y);
    let parent = el?.parentElement;
    while (parent?.parentElement && parent.getAttribute('data-page-number') === null) {
      parent = parent.parentElement;
    }
    if (parent) {
      const pageNumberStr = parent.getAttribute('data-page-number');
      if (pageNumberStr) {
        const pageNumber = parseInt(pageNumberStr);
        console.log('Detected page', { pageNumber });
        return pageNumber;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  addHighlightForSelection(
    color: { hex: string; marker: string | undefined } = {
      hex: '#45454513',
      marker: undefined,
    },
    pageNumber: number = this.currPageNumber
  ) {
    const selectionRects = document.getSelection()?.getRangeAt(0).getClientRects();

    if (this.selectionTools) {
      this.selectionTools.nativeElement.style.display = 'none';
    }
    if (selectionRects) {
      let pageNumberCandidate = this.getPageNumberFromPoint(
        selectionRects[0].x,
        selectionRects[0].y
      );
      if (pageNumberCandidate !== null) {
        pageNumber = pageNumberCandidate;
      }
      const annotations = this.annotationForPage.get(pageNumber) || [];
      const pdfPoints = [];
      for (let i = 0; i < selectionRects.length; i++) {
        const r = selectionRects.item(i);
        if (r) {
          const pdfPoint = this.getPDFPoint(r);
          if (pdfPoint) {
            pdfPoints.push(pdfPoint);
          }
        }
      }
      const newAnnotation: Annotation = {
        id: this.nanoid(),
        type: 'highlight',
        color: color.hex,
        points: pdfPoints,
        page: pageNumber,
        text: this.getSelection(),
      };
      annotations.push(newAnnotation);
      this.annotationAdded.emit(newAnnotation);
      this.annotationForPage.set(pageNumber, annotations);
      this.drawAnnotationOnPage(pageNumber, newAnnotation);
      document.getSelection()?.empty();
      this.saveDocument();
    }
  }

  drawAnnotationOnPage(pageNumber: number, annotation: Annotation) {
    if (this.getPdfViewerApplication()) {
      const page = this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1];
      const context: CanvasRenderingContext2D = page.canvas.getContext('2d');
      const viewport = page.viewport;
      if (context) {
        switch (annotation.type) {
          case 'area':
            context.fillStyle = annotation.color.substring(0, 7) + '20';
            context.strokeStyle = annotation.color.substring(0, 7) + '90';
            context.setLineDash([20, 3]);
            context.lineWidth = 2;
            annotation.points.forEach((point) => {
              const rect = viewport.convertToViewportRectangle(point);
              context.lineWidth = 1;
              context.strokeRect(
                rect[0],
                rect[1],
                Math.abs(rect[0] - rect[2]),
                Math.abs(rect[1] - rect[3])
              );

              context.fillRect(
                rect[0],
                rect[1],
                Math.abs(rect[0] - rect[2]),
                Math.abs(rect[1] - rect[3])
              );
            });
            break;
          case 'highlight':
            context.fillStyle = annotation.color;
            annotation.points.forEach((point) => {
              const rect = viewport.convertToViewportRectangle(point);
              context.fillRect(
                rect[0],
                rect[1],
                Math.abs(rect[0] - rect[2]) + 2,
                Math.abs(rect[1] - rect[3]) + 1
              );
            });
            break;
        }
        this.removeDivWithID(annotation.id);
        const delDiv = document.createElement('div');
        const bounds = this.getBoundsForAnnotations(annotation);
        const rect = viewport.convertToViewportRectangle(bounds);
        delDiv.setAttribute('id', environment.ANNOTATION_DEL_PREFIX + annotation.id);
        delDiv.setAttribute('class', 'annotationToolOverlay');
        delDiv.setAttribute('title', 'Delete annotation');
        delDiv.setAttribute(
          'style',
          ` position: absolute;
            left: ${Math.max(rect[0], rect[2]) - 1}px;
            top: ${Math.min(rect[1], rect[3]) - 20}px;
            width: 15px;
            height: 15px;
            background-image: url('assets/delete.svg');`
        );
        delDiv.onclick = async (event: any) => {
          this.deleteAnnotation(annotation.id);
        };
        page.div.appendChild(delDiv);
        const jumpDiv = document.createElement('div');
        jumpDiv.setAttribute('id', environment.ANNOTATION_JMP_PREFIX + annotation.id);
        jumpDiv.setAttribute('class', 'annotationToolOverlay annotationJumpOverlay');
        jumpDiv.setAttribute('title', 'Scroll into view');
        jumpDiv.setAttribute(
          'style',
          ` position: absolute;
            left: ${Math.max(rect[0], rect[2]) - 1}px;
            top: ${Math.min(rect[1], rect[3]) - 5}px;
            width: 15px;
            height: 15px;
            background-image: url('assets/right.svg');`
        );
        jumpDiv.onclick = async (event: any) => {
          this.scrollToAnnotation({
            annotationID: annotation.id,
            where: 'both',
          });
        };
        page.div.appendChild(jumpDiv);

        const anchorDiv = document.createElement('div');
        anchorDiv.setAttribute('id', environment.ANNOTATION_ANCHOR_PREFIX + annotation.id);
        anchorDiv.setAttribute('class', 'annotationToolOverlay annotationJumpOverlay');
        anchorDiv.setAttribute('title', 'Scroll into view');
        anchorDiv.setAttribute(
          'style',
          ` position: absolute;
            left: ${Math.max(rect[0], rect[2]) - 1}px;
            top: ${Math.min(rect[1], rect[3]) - 30}px;`
        );
        page.div.appendChild(anchorDiv);
        let observer = new IntersectionObserver((e) => this.handleAnnotationIntersection(e, annotation.id) );
        observer.observe(anchorDiv);
      }
    }
  }

  handleAnnotationIntersection(e: IntersectionObserverEntry[], annotationID: string){
    if(e.length < 1 ) return;

    if(e[0].isIntersecting && this.dataService.config.autoDrawLines){
      this.scrollToAnnotation({annotationID: annotationID, where: "both"});
    }
  }

  getAnnotationByID(annotationID: string) {
    for (const annots of this.annotationForPage.values()) {
      for (const annot of annots) {
        if (annot.id === annotationID) {
          return annot;
        }
      }
    }
    return undefined;
  }

  async scrollToAnnotation(event: { annotationID: string; where: 'pdf' | 'card' | 'both' }) {
    const annotation: Annotation | undefined = this.getAnnotationByID(event.annotationID);
    if (
      annotation &&
      !this.utils.isIDInView(environment.ANNOTATION_ANCHOR_PREFIX + event.annotationID)
    ) {
      this.currPageNumber = annotation.page;
    }

    switch (event.where) {
      case 'pdf':
        setTimeout(async () => {
          this.utils.scrollIDIntoView(environment.ANNOTATION_ANCHOR_PREFIX + event.annotationID);
        }, 400);
        break;
      case 'card':
        let el = document.getElementById(
          environment.ANNOTATION_ON_CARD_PREFIX + event.annotationID
        );
        if (el !== null) {
          el.classList.add('highlight');
        }
        console.log('Card', { el });
        this.utils.scrollIDIntoView(environment.ANNOTATION_ON_CARD_PREFIX + event.annotationID);
        const timeout = setTimeout(() => {
          if (el !== null) {
            el.classList.remove('highlight');
          }
          clearTimeout(timeout);
        }, 1000);
        break;
      default:
        setTimeout(async () => {
          if(this.currentLeaderLines.has(event.annotationID)){
            return;
          }
          
          this.utils.scrollIDIntoView(environment.ANNOTATION_ON_CARD_PREFIX + event.annotationID);
          this.utils.scrollIDIntoView(environment.ANNOTATION_ANCHOR_PREFIX + event.annotationID);
          const leaderLine = this.utils.createLineBetweenIds(
            environment.ANNOTATION_ON_CARD_PREFIX + annotation?.id,
            environment.ANNOTATION_JMP_PREFIX + annotation?.id,
            annotation?.color
            );

          this.currentLeaderLines.set(event.annotationID,leaderLine);
          do {
            await new Promise(res => setTimeout(res,700))
          } while(this.utils.isIDInView(environment.ANNOTATION_ANCHOR_PREFIX + event.annotationID) && this.dataService.config.autoDrawLines)
            if(this.currentLeaderLines.has(event.annotationID)){
              this.currentLeaderLines.delete(event.annotationID);
              leaderLine.remove();
            }
        }, 200);

        break;
    }
  }

  removeDivWithID(id: string) {

    if(this.currentLeaderLines.has(id)){
      this.currentLeaderLines.get(id).remove();
      this.currentLeaderLines.delete(id);
    }

    const jmpDiv = document.querySelector('#' + environment.ANNOTATION_JMP_PREFIX + id);
    if (jmpDiv) {
      jmpDiv.parentNode?.removeChild(jmpDiv);
    }
    const ancDiv = document.querySelector('#' + environment.ANNOTATION_ANCHOR_PREFIX + id);
    if (ancDiv) {
      ancDiv.parentNode?.removeChild(ancDiv);
    }
    const delDiv = document.querySelector('#' + environment.ANNOTATION_DEL_PREFIX + id);
    if (delDiv) {
      delDiv.parentNode?.removeChild(delDiv);
    }
  }

  getBoundsForAnnotations(annotation: Annotation) {
    if (annotation.points.length < 1) {
      return [0, 0, 0, 0];
    } else {
      let [x, y, x2, y2] = annotation.points[0];

      for (let i = 0; i < annotation.points.length; i++) {
        const point = annotation.points[i];
        if (point[0] === -0) {
          continue;
        }
        if (point[0] < x) x = point[0];
        if (point[1] < y) y = point[1];
        if (point[2] > x2) x2 = point[2];
        if (point[3] > y2) y2 = point[3];
      }
      return [x, y, x2, y2];
    }
  }

  getPdfViewerApplication(): IPDFViewerApplication {
    return (window as any).PDFViewerApplication;
  }

  getPDFPoint(
    clientRect: { left: number; right: number; bottom: number; top: number },
    pageNumber: number = this.currPageNumber
  ) {
    if (this.getPdfViewerApplication()) {
      let pageNumberCandidate = this.getPageNumberFromPoint(clientRect.left, clientRect.top);
      if (pageNumberCandidate !== null) {
        pageNumber = pageNumberCandidate;
      }
      const page = this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1];
      const pageRect: any = page.canvas.getClientRects()[0];
      let res: [number, number, number, number] = page.viewport
        .convertToPdfPoint(clientRect.left - pageRect.x, clientRect.top - pageRect.y)
        .concat(
          page.viewport.convertToPdfPoint(
            clientRect.right - pageRect.x,
            clientRect.bottom - pageRect.y
          )
        );
      return res;
    } else {
      return undefined;
    }
  }

  getSelection() {
    return document
      .getSelection()
      ?.toString()
      .replace(/ ̈u/g, 'ü')
      .replace(/ ̈a/g, 'ä')
      .replace(/ ̈o/g, 'ö')
      .replace(/-\n/g, '');
  }

  calcBoundsOfSelection(): DOMRect | undefined {
    const rect = document.getSelection()?.getRangeAt(0).getBoundingClientRect();
    return rect;
  }

  async deleteAnnotation(id: string) {
    const annotation = this.getAnnotationByID(id);
    if (annotation) {
      const filteredAnnot = this.annotationForPage
        .get(annotation.page)
        ?.filter((annot) => annot.id !== id);
      if (filteredAnnot) {
        this.annotationForPage.set(annotation.page, filteredAnnot);
        this.saveDocument();
      }
      const context = this.pdfCanvContext[annotation.page];
      const page = this.getPdfViewerApplication().pdfViewer._pages[annotation.page - 1];
      const viewport = page.viewport;

      const pageRef = await (this.getPdfViewerApplication().pdfViewer as any).pdfDocument.getPage(
        annotation.page
      );
      const renderRes = await pageRef.render({
        canvasContext: context,
        viewport: viewport,
      });
      this.removeDivWithID(id);
      setTimeout(() => {
        this.drawAnnotationsOnPage(annotation.page);
      }, 300);
    }
  }

  async updateAnnotation(changedAnnotation: Annotation) {
    const annotation = this.getAnnotationByID(changedAnnotation.id);
    if (annotation) {
      annotation.color = changedAnnotation.color;
      annotation.text = changedAnnotation.text;

      const context = this.pdfCanvContext[annotation.page];
      const page = this.getPdfViewerApplication().pdfViewer._pages[annotation.page - 1];
      const viewport = page.viewport;
      const pageRef = await (this.getPdfViewerApplication().pdfViewer as any).pdfDocument.getPage(
        annotation.page
      );
      const renderRes = await pageRef.render({
        canvasContext: context,
        viewport: viewport,
      });
      setTimeout(() => {
        this.drawAnnotationsOnPage(annotation.page);
      }, 200);
      this.saveDocument();
    }
  }

  // This is just an itial idea to show all lines of a page once we scroll to it. Maybe the Intersection Observer API is a better fit.
  onPageChange(newPageNumber: number){
    // const annotations = this.annotationForPage.get(newPageNumber)
    // if(annotations){
    //   annotations.forEach((annotation) => this.scrollToAnnotation({annotationID: annotation.id,where: 'both'}))
    // }
  }

  async saveDocument() {
    if (this.document) {
      this.document.currentPage = this.currPageNumber;
      const annotations = Array.from(this.annotationForPage.values());
      const flatAnnotations: Annotation[] = [];
      for (let i = 0; i < annotations.length; i++) {
        const annots = annotations[i];
        flatAnnotations.push(...annots);
      }
      const jsonAnnot = flatAnnotations.map((annot) => JSON.stringify(annot));
      this.document.annotations = jsonAnnot;
      console.log(this.document);
      await this.documentService.updateDocument(this.document);
    }
  }

}
