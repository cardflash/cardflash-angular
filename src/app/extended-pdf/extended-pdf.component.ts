import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { imgSrcToBlob } from 'blob-util';
import { customAlphabet } from 'nanoid';
import { IPDFViewerApplication, PageRenderedEvent } from 'ngx-extended-pdf-viewer';
import { environment } from 'src/environments/environment';
import { CardComponent } from '../card/card.component';
import { EditorFlipCardComponent } from '../card/editor-flip-card/editor-flip-card.component';
import { CardEntry, CardEntryContent, DataApiService, DocumentEntry } from '../data-api.service';
import { DataService } from '../data.service';
import { Annotation } from '../types/annotation';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-extended-pdf',
  templateUrl: './extended-pdf.component.html',
  styleUrls: ['./extended-pdf.component.scss'],
})
export class ExtendedPdfComponent implements OnInit, AfterViewInit, OnDestroy {
  public currPageNumber: number = 1;
  public pdfSrc: string = '/assets/pdfs/flashcards_siter_eu.pdf';
  public frontSelected: boolean = true;

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

  public document: DocumentEntry | undefined;
  public documentid: string | undefined;

  constructor(
    public utils: UtilsService,
    public dataService: DataService,
    private dataApi: DataApiService,
    private actRoute: ActivatedRoute,
    private router: Router
  ) {
    this.documentid = actRoute.snapshot.params.id;
  }

  public currentLeaderLines: Map<string, any> = new Map<string, any>();
  public currentLineDrawerInterval: NodeJS.Timeout | undefined;

  public areaSelectWithNormalMouse: boolean = false;

  public isCurrentlySelectingArea: boolean = false;

  private pdfOutline: { page: number; title: string }[] = [];

  public currentCard: CardEntryContent = {
    front: '',
    back: '',
    page: this.currPageNumber,
    hiddenText: '',
    chapter: '',
    title: '',
    creationTime: Date.now(),
  };
  @ViewChild(CardComponent) cardComp?: CardComponent;

  @ViewChildren('flipCard')
  public flipCardChilds?: QueryList<EditorFlipCardComponent>;

  public cards: CardEntry[] = [];

  public busy: boolean = false;

  ngOnInit(): void {
    if (this.documentid) {
      this.busy = true;
      this.dataApi.getDocument(this.documentid).then((res) => {
        this.document = res;
        this.loadFromDoc(res);
      });
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
      for (const l of this.currentLeaderLines.values()) {
        if (l) {
          l.position();
        }
      }
    }, 5);
  }

  ngOnDestroy(): void {
    for (const k of this.currentLeaderLines.keys()) {
      this.removeLeaderLinesForAnnotation(k);
    }
  }

  async loadFromDoc(doc: DocumentEntry) {
    if (doc) {
      this.document = doc;
      this.currPageNumber = doc.currentPage;
      const src = this.dataApi.getFileView(this.document?.fileid).href;
      this.pdfSrc = src;
      if (this.document && this.document.annotationsJSON) {
        for (let i = 0; i < this.document.annotationsJSON.length; i++) {
          const annotJSON = this.document.annotationsJSON[i];
          let annot: Annotation = JSON.parse(annotJSON);
          if (this.annotationForPage.has(annot.page)) {
            const forPage = this.annotationForPage.get(annot.page);
            forPage!.push(annot);
          } else {
            this.annotationForPage.set(annot.page, [annot]);
          }
        }
      }
      this.loadCards();
    }
  }

  getAllAnnotations() {
    let allAnnotations: Annotation[] = [];
    this.annotationForPage.forEach((val) => (allAnnotations = allAnnotations.concat(val)));
    console.log({ allAnnotations });
    return allAnnotations;
  }

  async pagesLoadComplete(e: any) {
    console.log('pagesLoadComplete');
    const outline = await this.getPdfViewerApplication().pdfDocument.getOutline();
    this.pdfOutline = [];
    if (outline) {
      for (let i = 0; i < outline.length; i++) {
        const outlineEl = outline[i];
        await this.addToPdfOutline(outlineEl.dest, outlineEl.title, outlineEl.items);
      }
    }
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

  pdfLoaded(e: any) {
    this.busy = false;
    setTimeout(() => {
      this.actRoute.fragment.subscribe((frag) => {
        if (frag && this.getAnnotationByID(frag)) {
          console.log({ frag });
          this.scrollToAnnotation({ annotationID: frag, where: 'all', drawLeaderLines: true });
          this.router.navigate([], { fragment: undefined });
        }
      });
    }, 2000);
  }

  pdfLoadFailed(e: any) {}

  async loadCards() {
    if (this.document && this.document.cardIDs) {
      this.cards = [];
      const allCardsProm: Promise<CardEntry>[] = [];
      for (let i = 0; i < this.document.cardIDs.length; i++) {
        const cardID = this.document.cardIDs[i];
        allCardsProm.push(this.dataApi.getCard(cardID));
      }
      this.cards = await Promise.all(allCardsProm);
    }
  }

  pageRendered(e: PageRenderedEvent) {
    let pdfCanv: HTMLCanvasElement = e.source.canvas;
    e.source.div.oncontextmenu = (event: any) => this.contextMenuOnPage(event, e.source.div);
    e.source.div.onmousedown = (event: any) => this.mouseDownOnPage(event, e.source.div);
    const pageCanvContext = pdfCanv.getContext('2d');
    if (pageCanvContext) {
      const dpr = window.devicePixelRatio || 1;
      pageCanvContext.scale(dpr, dpr);
      this.drawAnnotationsOnPage(e.pageNumber);
      this.calcScaling();
    }
  }

  textLayerRendered(e: any) {}

  calcScaling() {}

  mouseDownOnPage(e: MouseEvent, pageEl: HTMLDivElement) {
    if (this.areaSelectWithNormalMouse) {
      console.log('contextMenuOnPage', { e }, { pageEl });
      this.startAreaSelection(e, pageEl);
      this.areaSelectWithNormalMouse = false;
    }
  }
  contextMenuOnPage(e: MouseEvent, pageEl: HTMLDivElement) {
    if (!this.getSelection()) {
      console.log('contextMenuOnPage', { e }, { pageEl });
      this.startAreaSelection(e, pageEl);
    }
  }

  startAreaSelection(e: MouseEvent, pageEl: HTMLDivElement) {
    pageEl
      .querySelectorAll('*')
      .forEach((e) => e instanceof HTMLElement && (e.style.cursor = 'crosshair'));
    e.preventDefault();
    this.rect.x1 = e.x;
    this.rect.y1 = e.y;
    this.rect.x2 = e.x;
    this.rect.y2 = e.y;
    this.isCurrentlySelectingArea = true;

    pageEl.onmouseup = (event: any) => this.mouseUpOnPage(event, pageEl);
    pageEl.onmousemove = (event: any) => this.mouseMoveOnPage(event, pageEl);
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

    pageEl?.querySelectorAll('*').forEach((e) => e instanceof HTMLElement && (e.style.cursor = ''));
    this.isCurrentlySelectingArea = false;
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
    const sortedRect = { x1: x_min, x2: x_max, y1: y_min, y2: y_max };
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
      const id = this.nanoid();
      const newAnnotation: Annotation = {
        id: id,
        type: 'area',
        color: '#ffa62170',
        points: [pdfPoint],
        page: page,
      };
      const text = this.getTextFromPosition(sortedRect, page);
      if (this.dataService.config.addTextOption) {
        newAnnotation.text = text;
      } else {
        newAnnotation.hiddenText = text;
        const imgSrc = this.getImageFromSelection(sortedRect, page);
        if (imgSrc && this.documentid) {
          const blob: Blob = await imgSrcToBlob(imgSrc);
          const imgRes = await this.dataApi.saveFile(
            new File([blob], this.documentid + '_' + id + '.png')
          );
          if (imgRes.$id !== '') {
            newAnnotation.imgID = imgRes.$id;
          }
        }
      }

      this.addAnnotation(newAnnotation);
    }
  }

  getImageFromSelection(
    rect: { x1: number; x2: number; y1: number; y2: number },
    pageNumber: number
  ): string | undefined {
    const page = this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1];
    const canvasRect = (page.canvas as HTMLCanvasElement).getBoundingClientRect();
    const context: CanvasRenderingContext2D = page.canvas.getContext('2d');
    const x = rect.x1 - canvasRect.left;
    const y = rect.y1 - canvasRect.top;
    const width = rect.x2 - rect.x1;
    const height = rect.y2 - rect.y1;
    if (width <= 0 || height <= 0) {
      return undefined;
    }
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

  getTextFromPosition(
    rect: { x1: number; x2: number; y1: number; y2: number },
    pageNumber: number
  ) {
    const pageRef: HTMLElement | null =
      this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1]?.div;

    const pageRect = pageRef?.getBoundingClientRect();
    console.log({ pageRef });
    const textLayer: Element | null | undefined = pageRef?.querySelector('.textLayer');

    const spans: NodeListOf<HTMLSpanElement> | null | undefined =
      textLayer?.querySelectorAll('span');
    console.log({ spans }, { rect }, { pageRect });
    if (pageRef && textLayer && spans && pageRect) {
      let ret = '';
      spans.forEach((span) => {
        const x = parseFloat(span.style.left) + pageRect.left;
        const y = parseFloat(span.style.top) + pageRect.top;
        if (x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2) {
          ret += ' ' + span.textContent;
        }
      });
      return ret;
    } else {
      return '';
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
      hex: '#45454500',
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
      this.addAnnotation(newAnnotation);
      document.getSelection()?.empty();
    }
  }

  addAnnotation(newAnnotation: Annotation) {
    if (this.dataService.config.autoAddAnnotationsToCard) {
      this.addAnnotationToCard(newAnnotation, this.frontSelected ? 'front' : 'back');
    }
    const annotations = this.annotationForPage.get(newAnnotation.page) || [];
    annotations.push(newAnnotation);
    this.annotationAdded.emit(newAnnotation);
    this.annotationForPage.set(newAnnotation.page, annotations);
    this.drawAnnotationOnPage(newAnnotation.page, newAnnotation);
    this.saveDocument();
  }

  addAnnotationToCard(annotation: Annotation, side: 'front' | 'back') {
    if (this.documentid) {
      const reference = this.utils.generateReferenceFromAnnotation(annotation, this.documentid);
      if (this.currentCard.front === '' && this.currentCard.front === '') {
        this.currentCard.title = this.document?.name || '';
        this.currentCard.chapter = this.getOutlineForPage(this.currPageNumber);
      }
      if (side === 'front') {
        this.currentCard.front += reference;
      } else {
        this.currentCard.back += reference;
      }
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
            context.fillStyle = annotation.color.substring(0, 7) + '08';
            context.strokeStyle = annotation.color.substring(0, 7) + '90';
            context.setLineDash([20, 3]);
            context.lineWidth = 2;
            annotation.points.forEach((point) => {
              const rect = viewport.convertToViewportRectangle(point);
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
            where: 'all',
            drawLeaderLines: true,
          });
        };
        page.div.appendChild(jumpDiv);
        let observer = new IntersectionObserver((e) =>
          this.handleAnnotationIntersection(e, annotation.id)
        );
        observer.observe(jumpDiv);
      }
    }
  }

  handleAnnotationIntersection(e: IntersectionObserverEntry[], annotationID: string) {
    if (e.length < 1) return;

    if (e[0].isIntersecting && this.dataService.config.autoDrawLines) {
      this.scrollToAnnotation({ annotationID: annotationID, where: 'auto', drawLeaderLines: true });
    } else if (!e[0].isIntersecting) {
      this.removeLeaderLinesForAnnotation(annotationID);
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

  // auto <=> on pdf and annotation (used when auto draw lines is activated)
  // leader lines are only drawn if parameter is true and where is set to either auto or all
  async scrollToAnnotation(event: {
    annotationID: string;
    where: 'pdf' | 'annotations' | 'card' | 'auto' | 'all';
    drawLeaderLines?: boolean;
  }) {
    const annotation: Annotation | undefined = this.getAnnotationByID(event.annotationID);
    if (
      annotation &&
      !this.utils.isIDInView(environment.ANNOTATION_JMP_PREFIX + event.annotationID) &&
      (event.where === 'pdf' || event.where === 'all')
    ) {
      this.currPageNumber = annotation.page;
      // wait a moment to allow pdf reader to load page
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          resolve();
        }, 300);
      });
    }

    if (event.where === 'annotations' || event.where === 'auto' || event.where === 'all') {
      this.utils.scrollIDIntoView(environment.ANNOTATION_ELEMENT_PREFIX + event.annotationID);
    }
    // event.where === 'auto' ||
    if (event.where === 'pdf' || event.where === 'all') {
      setTimeout(async () => {
        this.utils.scrollIDIntoView(environment.ANNOTATION_JMP_PREFIX + event.annotationID);
      }, 400);
    }
    if (event.where === 'card' || event.where === 'all') {
      this.flipCardChilds?.forEach((fc) => fc.flipToSideForAnnotation(event.annotationID));

      const cardEls = document.querySelectorAll(`[data-annotationid=_${event.annotationID}]`);
      if (cardEls.length > 0) {
        console.log({ cardEls });
        let minEl = cardEls[cardEls.length - 1];
        // cardEls.forEach((el) => ( el.scrollHeight < minEl.scrollHeight) && (minEl = el))
        if (!this.utils.isElementInView(minEl)) {
          minEl.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        if (event.drawLeaderLines) {
          for (let i = 0; i < cardEls.length; i++) {
            const el = cardEls[i];
            if (event.where === 'all' && this.utils.isElementInView(el)) {
              const annotationEl = document.getElementById(
                environment.ANNOTATION_ELEMENT_PREFIX + event.annotationID
              );
              if (annotationEl) {
                const line = this.utils.createLineBetweenElements(
                  el,
                  annotationEl,
                  annotation?.color,
                  3,
                  false,
                  false
                );
                setTimeout(() => {
                  line.remove();
                }, 1500);
              }
            }
          }
        }
      }
    }
    if (event.where === 'annotations' || event.where === 'auto' || event.where === 'all') {
      let el = document.getElementById(environment.ANNOTATION_ELEMENT_PREFIX + event.annotationID);
      if (el !== null) {
        el.classList.add('highlight');
        setTimeout(() => {
          if (el !== null) {
            el.classList.remove('highlight');
          }
        }, 1000);
      }
    }

    if (event.drawLeaderLines) {
      if (event.where === 'auto' || event.where === 'all') {
        // also check for value bc it might be undefined? In that case we will simply overwrite it with new one
        if (
          !(
            this.currentLeaderLines.has(event.annotationID) &&
            this.currentLeaderLines.get(event.annotationID)
          )
        ) {
          // Draw new leaderLines between pdf and annotation

          const leaderLine = this.utils.createLineBetweenIds(
            environment.ANNOTATION_ELEMENT_PREFIX + annotation?.id,
            environment.ANNOTATION_JMP_PREFIX + annotation?.id,
            annotation?.color,
            event.where === 'all' ? 7 : 5,
            false
          );

          this.currentLeaderLines.set(event.annotationID, leaderLine);
          // Don't remove line if autoDraw is activated: The intersectionObserver will take care of that when its out of view
          if (event.where === 'all') {
            setTimeout(async () => {
              if (
                !(
                  this.dataService.config.autoDrawLines &&
                  this.utils.isIDInView(environment.ANNOTATION_JMP_PREFIX + event.annotationID)
                )
              ) {
                this.removeLeaderLinesForAnnotation(event.annotationID);
              }
            }, 1500);
          }
        } else {
          console.log(
            'leaderLine already exists',
            event.annotationID,
            this.currentLeaderLines.get(event.annotationID)
          );
        }
      }
    }
  }

  removeLeaderLinesForAnnotation(annotationID: string) {
    if (this.currentLeaderLines.has(annotationID)) {
      const ll = this.currentLeaderLines.get(annotationID);
      if (ll) {
        ll.remove();
        this.currentLeaderLines.delete(annotationID);
      }
    }
  }

  removeDivWithID(id: string) {
    this.removeLeaderLinesForAnnotation(id);

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
    if (annotation?.imgID) {
      await this.dataApi.deleteFile(annotation.imgID);
    }
    if (annotation) {
      const filteredAnnot = this.annotationForPage
        .get(annotation.page)
        ?.filter((annot) => annot.id !== id);
      if (filteredAnnot) {
        this.annotationForPage.set(annotation.page, filteredAnnot);
        this.saveDocument();
      }
      const context = this.tryGetPageCanvasContext(annotation.page);
      if (context != null) {
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
        }, 300);
      }
      this.removeDivWithID(id);
    }
  }

  tryGetPageCanvasContext(pageNumber: number) {
    const page = this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1];
    const canvas = page.div.querySelector('div.canvasWrapper > canvas');
    if (canvas) {
      return canvas.getContext('2d');
    } else {
      return null;
    }
  }

  async updateAnnotation(changedAnnotation: Annotation) {
    console.log({ changedAnnotation });
    const annotation = this.getAnnotationByID(changedAnnotation.id);
    if (annotation) {
      annotation.color = changedAnnotation.color;
      annotation.text = changedAnnotation.text;

      const context = this.tryGetPageCanvasContext(annotation.page);
      if (context != null) {
        const page = this.getPdfViewerApplication().pdfViewer._pages[annotation.page - 1];
        console.log({ context }, { page });
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
      }

      this.saveDocument();
    }
  }

  // This is just an itial idea to show all lines of a page once we scroll to it. Maybe the Intersection Observer API is a better fit.
  onPageChange(newPageNumber: number) {
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
      this.document.annotationsJSON = jsonAnnot;
      console.log(this.document);
      this.document.cardIDs = this.cards.map((c) => c.$id);
      await this.dataApi.updateDocument(this.document.$id, this.document);
    }
  }

  updateCard(card: CardEntry | CardEntryContent) {
    this.finishCard(card);
  }

  deleteCard(card: CardEntry | CardEntryContent) {
    if (card.$id) {
      this.dataApi.deleteCard(card.$id);
      this.cards = this.cards.filter((c) => c.$id !== card.$id);
    }
  }

  getCardId(index: number, card: CardEntry | CardEntryContent) {
    return card.$id || index;
  }

  async finishCard(newCard?: CardEntryContent | CardEntry) {
    const cardCopy = { ...this.currentCard };
    await this.saveCard(cardCopy);
    this.nextCard(newCard);
  }

  async saveCard(card: CardEntry | CardEntryContent) {
    if (!card.$id && !card.front && !card.back) {
      return;
    }

    window.addEventListener('beforeunload', function (e) {
      delete e['returnValue'];
    });
    card = await this.utils.replaceWithServerImgs(card);
    const cardIsNew = !card.$id;
    const saveOrUpdatePromise: Promise<CardEntry> = card.$id
      ? this.dataApi.updateCard(card.$id, card)
      : this.dataApi.createCard(card);
    saveOrUpdatePromise
      .then((res) => {
        if (this.dataService.config.autoAddAnki) {
          this.utils.saveCard(res, 'anki', this.dataService.config.deckName);
        }
        if (cardIsNew) {
          this.cards.push(res);
          const cardIDs = this.document?.cardIDs || [];
          cardIDs.push(res.$id);
          if (this.document) {
            this.document.cardIDs = cardIDs;
            this.saveDocument();
          }
        }
      })
      .catch((reas) => {
        if (this.dataService.config.autoAddAnki) {
          this.utils.saveCard(card, 'anki', this.dataService.config.deckName);
        }
      });
  }

  async nextCard(newCard?: CardEntryContent | CardEntry) {
    if (!newCard) {
      newCard = {
        front: '',
        back: '',
        page: this.currPageNumber,
        chapter: this.getOutlineForPage(this.currPageNumber),
        title: this.document?.name || '',
        hiddenText: '',
        creationTime: Date.now(),
      };
    }
    this.frontSelected = true;
    this.currentCard = newCard;
  }

  async addToPdfOutline(
    dest: any,
    title: string,
    items: { dest: any; title: string; items: [] }[]
  ) {
    if (!dest) {
      return;
    }
    if (typeof dest === 'string') {
      dest = await this.getPdfViewerApplication().pdfDocument.getDestination(dest); // returns array, index 0 is ref
    }
    if (!('num' in dest) || !('gen' in dest)) {
      dest = dest[0];
    }
    const pageIndex: number = await this.getPdfViewerApplication().pdfDocument.getPageIndex(dest); //returns pageNr-1
    this.pdfOutline.push({ page: pageIndex + 1, title: title });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let dest = item.dest;
      if (typeof dest !== 'string') {
        dest = dest[0];
      }
      await this.addToPdfOutline(dest, title + ' - ' + item.title, item.items);
    }
  }

  getOutlineForPage(page: number) {
    for (let i = this.pdfOutline.length - 1; i >= 0; i--) {
      const el = this.pdfOutline[i];
      if (el.page <= page) {
        return el.title;
      }
    }
    return '';
  }
}
