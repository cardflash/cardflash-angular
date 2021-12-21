import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { customAlphabet } from 'nanoid';
import { IPDFViewerApplication, PageRenderedEvent } from 'ngx-extended-pdf-viewer';
import { environment } from 'src/environments/environment';
import { Annotation } from '../types/annotation';

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

  public availableAnnotationColors: { hex: string; marker: string }[] = [
    { hex: '#f3ea504f', marker: 'marker-light-yellow' },
    { hex: '#5eacf94f', marker: 'marker-light-blue' },
    { hex: '#5ef98c4f', marker: 'marker-light-green' },
    { hex: '#f95ef34f', marker: 'marker-light-pink' },
  ];
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

  constructor() {}

  ngOnInit(): void {}

  async ngAfterViewInit() {
    document.addEventListener('selectionchange', () => this.onSelect());
  }

  getAllAnnotations(){
    let allAnnotations : Annotation[] = [];
    this.annotationForPage.forEach((val) => allAnnotations = allAnnotations.concat(val))
    console.log({allAnnotations})
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
              if (bounds) {
                this.selectionTools.nativeElement.style.display = 'block';
                this.selectionTools.nativeElement.style.top = bounds.top - 150 + 'px';
                this.selectionTools.nativeElement.style.left = bounds.left + 'px';
              }
            }
          }, 700);
        }
      }
    }
  }

  pdfLoaded(e: any) {}

  pdfLoadFailed(e: any) {}

  pageRendered(e: PageRenderedEvent) {
    let pdfCanv: HTMLCanvasElement = e.source.canvas;
    if (this.pdfCanvContext) {
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

  drawAnnotationsOnPage(pageNumber: number) {
    const annotations = this.annotationForPage.get(pageNumber);
    if (annotations) {
      annotations.forEach((annotation) => {
        this.drawAnnotationOnPage(pageNumber, annotation);
      });
    }
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
      const newAnnotation = {
        id: this.nanoid(),
        type: 'highlight',
        color: color.hex, 
        points: pdfPoints,
        page: pageNumber,
      };
      annotations.push(newAnnotation);
      this.annotationAdded.emit(newAnnotation);
      this.annotationForPage.set(pageNumber, annotations);
      this.drawAnnotationOnPage(pageNumber, newAnnotation);
    }
  }

  drawAnnotationOnPage(pageNumber: number, annotation: Annotation) {
    if (this.getPdfViewerApplication()) {
      const page = this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1];
      const context : CanvasRenderingContext2D = page.canvas.getContext('2d');
      const viewport = page.viewport;
      if (context) {
        switch (annotation.type) {
          case 'area':
            context.fillStyle = annotation.color;
            context.strokeStyle = '#000';
            context.lineWidth = 1;
            annotation.points.forEach((point) => {
              const rect = viewport.convertToViewportRectangle(point);
              context.fillRect(
                rect[0],
                rect[1],
                Math.abs(rect[0] - rect[2]),
                Math.abs(rect[1] - rect[3])
              );
              context.strokeRect(
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
                Math.abs(rect[0] - rect[2])+2,
                Math.abs(rect[1] - rect[3])+1
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
          'position: absolute; left:' +
            (Math.min(rect[0], rect[2]) - 15) +
            'px; top:' +
            (Math.min(rect[1], rect[3]) - 50) +
            "px; width: 15px; height: 15px; background-image: url('assets/delete.svg');"
        );
        delDiv.onclick = async (event: any) => {
          this.deleteAnnotation(annotation.id);
        };
        page.div.appendChild(delDiv);

        const jumpDiv = document.createElement('div');
        jumpDiv.setAttribute('id', environment.ANNOTATION_JMP_PREFIX + annotation.id);
        jumpDiv.setAttribute('class', 'annotationToolOverlay');
        jumpDiv.setAttribute('title', 'Scroll into view');
        jumpDiv.setAttribute(
          'style',
          'position: absolute; left:' +
            (Math.min(rect[0], rect[2]) - 15) +
            'px; top:' +
            (Math.min(rect[1], rect[3]) - 33) +
            "px; width: 15px; height: 15px; background-image: url('assets/right.svg');"
        );
        jumpDiv.onclick = async (event: any) => {
          this.scrollToAnnotation({
            annotationID: annotation.id,
            where: 'card',
          });
        };
        page.div.appendChild(jumpDiv);
      }
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
    if (annotation) {
      this.currPageNumber = annotation.page;
    }
    setTimeout(async () => {
      switch (event.where) {
        case 'pdf':
          this.scrollIDIntoView(environment.ANNOTATION_JMP_PREFIX + event.annotationID);
          break;
        case 'card':
          this.scrollIDIntoView(environment.ANNOTATION_ON_CARD_PREFIX + event.annotationID);
          break;
        default:
          this.scrollIDIntoView(environment.ANNOTATION_JMP_PREFIX + event.annotationID);
          this.scrollIDIntoView(environment.ANNOTATION_ON_CARD_PREFIX + event.annotationID);
          break;
      }
    }, 400);
  }

  scrollIDIntoView(id: string) {
    document.querySelector('#' + id)?.scrollIntoView({ behavior: 'smooth' });
  }

  removeDivWithID(id: string) {
    const jmpDiv = document.querySelector('#' + environment.ANNOTATION_JMP_PREFIX + id);
    if (jmpDiv) {
      jmpDiv.parentNode?.removeChild(jmpDiv);
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
}
