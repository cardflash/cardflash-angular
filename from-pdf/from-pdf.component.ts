import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  IPDFViewerApplication,
  PageRenderedEvent,
  PagesLoadedEvent,
  PageViewport,
} from 'ngx-extended-pdf-viewer';
import { CardComponent } from '../../card/card.component';
import { Card } from '../../types/card';
import { Config } from '../../types/config';
import { Rectangle } from '../../types/rectangle';
import { customAlphabet } from 'nanoid';
import { DataService } from '../../data.service';
import { recognize } from 'tesseract.js';
import { TesseractLanguages } from '../../data/tesseract-languages';
import { AnnotationFactory } from 'annotpdf';
import { Annotation } from 'src/app/types/annotation';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { PDFDocument } from 'src/app/types/pdf-document';
import { HttpClient } from '@angular/common/http';
import { CardService } from 'src/app/card/card.service';
import { timeStamp } from 'console';
import { threadId } from 'worker_threads';
import { DocumentService } from 'src/app/document.service';
import { Subscription } from 'rxjs';
import { EditorFlipCardComponent } from 'src/app/card/editor-flip-card/editor-flip-card.component';
import { UserNotifierService } from 'src/app/services/notifier/user-notifier.service';
@Component({
  selector: 'app-from-pdf',
  templateUrl: './from-pdf.component.html',
  styleUrls: ['./from-pdf.component.scss'],
})
export class FromPdfComponent implements OnInit, AfterViewInit, OnDestroy {
  pdfSrc: string | Uint8Array = '';
  numPages = 1;
  page = 1;

  zIndex: number = 0;
  private readonly nanoid = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    10
  );

  pdfApplication?: IPDFViewerApplication;

  @ViewChild('fileSelector')
  private fileSelector?: ElementRef<HTMLInputElement>;

  @ViewChild('selCanv')
  private selCanv?: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewCanvas')
  private previewCanvas?: ElementRef<HTMLCanvasElement>;

  private pdfCanvContext: CanvasRenderingContext2D[] = [];

  textDivs: HTMLElement[][] = [];

  private context?: CanvasRenderingContext2D;
  private previewContext?: CanvasRenderingContext2D;

  //rectangle stuff
  private rect: Rectangle = { x: 0, y: 0, width: 0, height: 0 };
  dragging: boolean = false;

  //download stuff
  public downloadLink: string = '';
  @ViewChild('downloadAnchor')
  private downloadAnchor?: ElementRef<HTMLAnchorElement>;

  @ViewChild('selectionTools')
  private selectionTools?: ElementRef<HTMLDivElement>;

  public selectionTimeout: NodeJS.Timeout | undefined = undefined;

  public selectionBox:
    | { x: number; y: number; absX: number; absY: number }
    | undefined = undefined;
  //cards
  public cards: Card[] = [];

  public currentCard: Card = {
    localID: this.nanoid(),
    front: '',
    back: '',
    page: this.page,
    hiddenText: '',
    chapter: '',
    title: '',
  };

  public frontSelected: boolean = true;

  public scale: number = 1;
  public sidebarVisible: boolean = false;

  public ocrLoadingNum: number = 0;


  public disablePDFViewer: boolean = false;
  private pdfOutline: { page: number; title: string }[] = [];

  private mouseStillDown: boolean = false;

  public title: string = '';
  public titleOptions: string[] = [];
  public chapter: string = '';

  @ViewChild(CardComponent) cardComp?: CardComponent;

  public annotationFactory?: AnnotationFactory;

  public annotationForPage: Map<number, Annotation[]> = new Map<
    number,
    Annotation[]
  >();

  public availableAnnotationColors: { hex: string; marker: string }[] = [
    { hex: '#f3ea504f', marker: 'marker-light-yellow' },
    { hex: '#5eacf94f', marker: 'marker-light-blue' },
    { hex: '#5ef98c4f', marker: 'marker-light-green' },
    { hex: '#f95ef34f', marker: 'marker-light-pink' },
  ];

  @ViewChildren('flipCard')
  public flipCardChilds?: QueryList<EditorFlipCardComponent>;

  public busy: boolean = false;
  public documentid: string | undefined;
  public document: PDFDocument | undefined;
  public documentSub: Subscription | undefined;

  public selectionInsertTypes  : ['h1', 'h2', 'normal','small'] = ['h1', 'h2', 'normal','small'];
  
  public selectionInsertType : 'small' | 'normal' | 'h1' | 'h2' = 'normal';

  constructor(
    public dataService: DataService,
    private actRoute: ActivatedRoute,
    private documentService: DocumentService,
    private userNotifier: UserNotifierService
  ) {
    this.documentid = actRoute.snapshot.params.id;
  }
  async ngOnInit() {
    if (this.documentid) {
      this.userNotifier.loadStatus = 20;
      let timeout = setTimeout(() => {
         this.userNotifier.loadStatus = Math.max(60,this.userNotifier.loadStatus)
      }
      ,100)
      
      this.documentSub = this.documentService.documents$.subscribe((docs) => {
        if (docs !== undefined){
          clearTimeout(timeout)
          this.userNotifier.loadStatus = 80;
          this.loadFromDocs(docs)
          this.userNotifier.loadStatus = 100;
        }
      }
      );
    }else{
      this.userNotifier.loadStatus = 100;
    }
    this.dataService.init().then(async () => {
      if (this.dataService.prefs['config']) {
        this.dataService.config = this.dataService.prefs['config'];
      }
    });
  }

  loadFromDocs(docs: Map<string, PDFDocument>) {
    if (this.documentid && !this.document) {
      const doc = docs.get(this.documentid);
      this.busy = true;
      if (doc) {
        this.documentSub?.unsubscribe();
        this.document = doc;
        if (this.document.cards) {
        }
        this.title = doc.name;
        this.titleOptions = [this.title];

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
  }

  async ngOnDestroy() {
    this.documentSub?.unsubscribe();
  }

  async ngAfterViewInit() {
    if (this.selCanv) {
      const context = this.selCanv.nativeElement.getContext('2d');
      if (context != null) {
        this.context = context;
        this.context.strokeStyle = 'gray';
        this.context.lineWidth = 1.5;
        this.context.setLineDash([5]);
      }
      this.selCanv.nativeElement.addEventListener(
        'touchstart',
        this.touchStart.bind(this),
        { passive: false, capture: true }
      );
      this.selCanv.nativeElement.addEventListener(
        'touchmove',
        this.touchMove.bind(this),
        { passive: false, capture: true }
      );

      const previewContext = this.previewCanvas?.nativeElement.getContext('2d');
      if (previewContext) {
        this.previewContext = previewContext;
      }
    }
    let viewerContainerRef: HTMLElement | null =
      document.querySelector<HTMLElement>('#viewerContainer');
    if (viewerContainerRef) {
      viewerContainerRef.oncontextmenu = this.mouseDown.bind(this);
      viewerContainerRef.onmousemove = this.mouseMove.bind(this);
      viewerContainerRef.onmouseup = this.finishRect.bind(this);
    }
    document.addEventListener('selectionchange', () => this.onSelect());
    this.calcScaling();
  }

  async loadComplete(e: PagesLoadedEvent) {
    console.log("loadComplete")
    this.numPages = e.pagesCount;
    if (this.document) {
      this.page = this.document.currentPage;
    } else {
      this.page = 1;
    }
    this.pdfApplication = (window as any).PDFViewerApplication;
    if (!this.document) {
      this.titleOptions = [this.title];

      this.title = '';
      const pdfTitle = (this.pdfApplication as any).documentInfo?.Title;
      if (pdfTitle) {
        this.titleOptions.push(pdfTitle);
        this.title = pdfTitle;
      }
      const files = this.fileSelector?.nativeElement.files;
      if (files && files.length >= 1) {
        const fileTitle = files[0].name;
        this.titleOptions.push(fileTitle.replace('.pdf', ''));
        if (!this.title) {
          this.title = fileTitle;
        }
      }
    }

    const outline = await this.pdfApplication?.pdfDocument.getOutline();
    this.pdfOutline = [];
    if (outline) {
      for (let i = 0; i < outline.length; i++) {
        const outlineEl = outline[i];
        await this.addToPdfOutline(
          outlineEl.dest,
          outlineEl.title,
          outlineEl.items
        );
      }
    }
    // const data = await this.pdfApplication?.pdfDocument.getData();
    // if (!this.annotationFactory) {
    //   this.annotationFactory = new AnnotationFactory(data);
    // }
  }

  pdfLoadComplete(event: any) {
    this.busy = false;
    console.log('LOAD COMPLETE', event, this.annotationForPage);
    const pages = Array.from(this.annotationForPage.keys());
    setTimeout(() => {
      pages.forEach((page) => {
        console.log('drawing annotations for page', page);
        // this.drawAnnotationsOnPage(page);
      });
    }, 800);
  }

  pdfLoadFailed(event: any){
    this.busy = false;
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
      dest = await this.pdfApplication?.pdfDocument.getDestination(dest); // returns array, index 0 is ref
    }
    if (!('num' in dest) || !('gen' in dest)) {
      dest = dest[0];
    }
    const pageIndex: number =
      await this.pdfApplication?.pdfDocument.getPageIndex(dest); //returns pageNr-1
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

  calcScaling() {
    let sidebarRef: HTMLElement | null =
      document.querySelector<HTMLElement>('#sidebarContent');
    let viewerContainerRef: HTMLElement | null =
      document.querySelector<HTMLElement>('#viewerContainer');

    if (sidebarRef && viewerContainerRef && this.selCanv && this.context) {
      let bodyRect = document.body.getBoundingClientRect();
      let clientRect = viewerContainerRef.getBoundingClientRect();

      var width = clientRect.width;
      var height = clientRect.height;
      let left = clientRect.left - bodyRect.left;
      let top = clientRect.top - bodyRect.top;

      if (this.sidebarVisible && viewerContainerRef.offsetLeft == 0) {
        this.selCanv.nativeElement.style.marginLeft =
          sidebarRef.offsetWidth + 'px';
        width = width - sidebarRef.offsetWidth;
      } else {
        this.selCanv.nativeElement.style.marginLeft = 0 + 'px';
      }

      this.selCanv.nativeElement.style.top = top + 'px';
      this.selCanv.nativeElement.style.left = left + 'px';

      this.scale = window.devicePixelRatio;
      this.selCanv.nativeElement.width = Math.floor(width * this.scale);
      this.selCanv.nativeElement.height = Math.floor(height * this.scale);
      this.selCanv.nativeElement.style.width = width + 'px';
      this.selCanv.nativeElement.style.height = height + 'px';
      this.context.scale(this.scale, this.scale);
    }
  }

  onFileSelected() {
    if (typeof FileReader !== 'undefined') {
      let reader = new FileReader();

      reader.onload = (e: any) => {
        this.busy = true;
        this.pdfSrc = e.target.result;
      };

      const files = this.fileSelector?.nativeElement.files;
      if (files && files.length >= 1) {
        reader.readAsArrayBuffer(files[0]);
      }
    }
  }

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

  drawAnnotationsOnPage(pageNumber: number) {
    console.log("DRAWING ANNOTATIONS ON PAGE__",pageNumber);
    const annotations = this.annotationForPage.get(pageNumber);
    if (annotations) {
      annotations.forEach((annotation) => {
        this.drawAnnotationOnPage(pageNumber, annotation);
      });
    }
  }

  drawAnnotationOnPage(pageNumber: number, annotation: Annotation) {
    if (this.pdfApplication) {
      const context = this.pdfCanvContext[pageNumber];
      const page = this.pdfApplication.pdfViewer._pages[pageNumber - 1];
      const viewport = page.viewport;
      if (context) {
        switch(annotation.type){
          case 'area':
            context.fillStyle = annotation.color;
            context.strokeStyle = "#000";
            context.lineWidth = 1
            // context.setLineDash([5,1])
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
                Math.abs(rect[0] - rect[2]),
                Math.abs(rect[1] - rect[3])
              );
            });
            break;
        }
        this.removeDivWithID(annotation.id);
        const delDiv = document.createElement('div');
        const bounds = this.getBoundsForAnnotations(annotation);
        const rect = viewport.convertToViewportRectangle(bounds);
        // context.fillStyle = "red";
        // context.fillRect(
        //   rect[0]+(Math.abs(rect[0]-rect[2])/2),
        //   Math.min(rect[1],rect[3]),
        //   10,
        //   10
        // );
        delDiv.setAttribute(
          'id',
          environment.ANNOTATION_DEL_PREFIX + annotation.id
        );
        delDiv.setAttribute('class', 'annotationToolOverlay');
        delDiv.setAttribute('title', 'Delete annotation');
        delDiv.setAttribute(
          'style',
          'position: absolute; left:' +
            (Math.min(rect[0], rect[2]) - 15) +
            'px; top:' +
            (Math.min(rect[1], rect[3]) - 15) +
            "px; width: 15px; height: 15px; background-image: url('assets/delete.svg');"
        );
        delDiv.onclick = async (event: any) => {
          this.deleteAnnotation(annotation.id);
        };
        page.div.appendChild(delDiv);

        const jumpDiv = document.createElement('div');
        jumpDiv.setAttribute(
          'id',
          environment.ANNOTATION_JMP_PREFIX + annotation.id
        );
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

  async scrollToAnnotation(event: {
    annotationID: string;
    where: 'pdf' | 'card' | 'both';
  }) {
    const annotation: Annotation | undefined = this.getAnnotationByID(
      event.annotationID
    );
    if (annotation) {
      this.page = annotation.page;
    }
    if (event.where === 'card' || event.where === 'both') {
      this.flipCardChilds?.forEach((fc) =>
        fc.flipToSideForAnnotation(event.annotationID)
      );
    }
    setTimeout(async () => {
      switch (event.where) {
        case 'pdf':
          // await this.router.navigate([], {
          //   fragment: environment.ANNOTATION_JMP_PREFIX + event.annotation.id,
          // });
          this.scrollIDIntoView(
            environment.ANNOTATION_JMP_PREFIX + event.annotationID
          );
          break;
        case 'card':
          // await this.router.navigate([], {
          //   fragment: environment.ANNOTATION_ON_CARD_PREFIX + event.annotation.id,
          // });
          this.scrollIDIntoView(
            environment.ANNOTATION_ON_CARD_PREFIX + event.annotationID
          );
          break;
        default:
          // await this.router.navigate([], {
          //   fragment: environment.ANNOTATION_JMP_PREFIX + event.annotation.id,
          // });
          this.scrollIDIntoView(
            environment.ANNOTATION_JMP_PREFIX + event.annotationID
          );
          this.scrollIDIntoView(
            environment.ANNOTATION_ON_CARD_PREFIX + event.annotationID
          );
          // await this.router.navigate([], {
          //   fragment: environment.ANNOTATION_ON_CARD_PREFIX + event.annotation.id,
          // });
          break;
      }
    }, 400);
  }

  scrollIDIntoView(id: string) {
    document.querySelector('#' + id)?.scrollIntoView({ behavior: 'smooth' });
  }

  getCards() {
    if (this.document) {
      if (this.document.cards) {
        return this.document.cards;
      } else {
        this.document.cards = [];
        return this.document.cards;
      }
    } else {
      return this.cards;
    }
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

      this.saveDocument();

      if (this.pdfApplication) {
        const context = this.pdfCanvContext[annotation.page];
        const page = this.pdfApplication.pdfViewer._pages[annotation.page - 1];
        const viewport = page.viewport;

        const pageRef = await (
          this.pdfApplication.pdfViewer as any
        ).pdfDocument.getPage(this.page);
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

  removeDivWithID(id: string) {
    const jmpDiv = document.querySelector(
      '#' + environment.ANNOTATION_JMP_PREFIX + id
    );
    if (jmpDiv) {
      jmpDiv.parentNode?.removeChild(jmpDiv);
    }
    const delDiv = document.querySelector(
      '#' + environment.ANNOTATION_DEL_PREFIX + id
    );
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

  getPDFPoint(
    clientRect:
      | ClientRect
      | { left: number; right: number; bottom: number; top: number }
  ) {
    if (this.pdfApplication) {
      const page = this.pdfApplication.pdfViewer._pages[this.page - 1];
      const pageRect: any = page.canvas.getClientRects()[0];
      let res: [number, number, number, number] = page.viewport
        .convertToPdfPoint(
          clientRect.left - pageRect.x,
          clientRect.top - pageRect.y
        )
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

  onSelect() {
    const sel: Selection | null = document.getSelection();

    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }

    if (sel && sel.focusNode) {
      if (
        (<Element>sel.focusNode).parentElement?.parentElement?.className ==
          'textLayer' ||
        (<Element>sel.focusNode).parentElement?.parentElement?.parentElement
          ?.className == 'textLayer'
      ) {
        const span = (<Element>sel.focusNode).parentElement;
        if (
          sel.toString() != '' &&
          this.selectionTools &&
          span &&
          span.nodeName == 'SPAN' &&
          this.pdfApplication
        ) {
          this.selectionTools.nativeElement.style.display = 'none';
          this.selectionTimeout = setTimeout(() => {
            if (this.selectionTools) {
              const bounds = this.calcBoundsOfSelection();
              if (bounds) {
                this.selectionTools.nativeElement.style.display = 'block';
                this.selectionTools.nativeElement.style.top =
                  bounds.top - 110 + 'px';
                this.selectionTools.nativeElement.style.left =
                  bounds.left + 'px';
              }
            }
          }, 700);
        }
      }
    }
  }

  getSelection() {
    return document.getSelection()?.toString().replace(/ ̈u/g,'ü').replace(/ ̈a/g,'ä').replace(/ ̈o/g,'ö').replace(/-\n/g,'');
  }

  calcBoundsOfSelection(): DOMRect | undefined {
    const rect = document.getSelection()?.getRangeAt(0).getBoundingClientRect();
    return rect;
  }
  addHighlightForSelection(
    color: { hex: string; marker: string | undefined } = {
      hex: '#45454513',
      marker: undefined,
    }
  ) {
    const selectionRects = document
      .getSelection()
      ?.getRangeAt(0)
      .getClientRects();
    if (selectionRects) {
      const annotations = this.annotationForPage.get(this.page) || [];
      const pdfPoints = [];
      for (let i = 0; i < selectionRects.length; i++) {
        const r = selectionRects.item(i);
        if (r) {
          const pdfPoint = this.getPDFPoint(r);
          if (pdfPoint) {
            pdfPoints.push(pdfPoint);

            // Add annotations to pdf
            var splitHex = color.hex.substring(1).match(/.{1,2}/g);
            if (!splitHex) {
              splitHex = ['45', '45', '45'];
            }
            // this.annotationFactory?.createHighlightAnnotation(
            //   this.page - 1,
            //   pdfPoint,
            //   'test name',
            //   'test author',
            //   {
            //     r: parseInt(splitHex[0], 16),
            //     g: parseInt(splitHex[1], 16),
            //     b: parseInt(splitHex[2], 16),
            //   }
            // );
          }
        }
      }
      const newAnnotation = {
        id: this.nanoid(),
        type: 'highlight',
        color: color.hex,
        points: pdfPoints,
        page: this.page,
      };
      annotations.push(newAnnotation);
      this.annotationForPage.set(this.page, annotations);
      this.drawAnnotationOnPage(this.page, newAnnotation);
      this.addTextSelectionToCard(color.marker, newAnnotation);
      this.saveDocument();
    }
  }

  addTextSelectionToCard(
    marker: string | undefined = undefined,
    annotation: Annotation
  ) {
    let toAdd: string = '';
    if (!marker) {
      toAdd = `<span id="${environment.ANNOTATION_ON_CARD_PREFIX}${
        annotation.id
      }" annotationColor="${
        annotation.color
      }">${this.getSelection()}</span><br/>`;
    } else {
      toAdd = `<mark class="${marker}"><span id="${
        environment.ANNOTATION_ON_CARD_PREFIX
      }${annotation.id}" annotationColor="${
        annotation.color
      }">${this.getSelection()}</span></mark><br/>`;
    }


    switch (this.selectionInsertType) {
      case 'small':
        toAdd = `<p><span class="text-small">${toAdd}</span></p>`
        break;
      case 'normal':
        toAdd = `<p>${toAdd}</p>`
        // nothing to do
        break;
      case 'h2':
        // heading 2 in ckeditor correspodns to h3 html element
        toAdd = `<h3>${toAdd}</h3>`
        break;
      case 'h1':
        // heading 1 in ckeditor correspodns to h2 html element
        toAdd = `<h2>${toAdd}</h2>`
        break;
    }
    // reset insert type to 'normal'
    this.selectionInsertType = 'normal';
    

    if (this.frontSelected) {
      this.addToCard('front', toAdd);
    } else {
      this.addToCard('back', toAdd);
    }
    document.getSelection()?.empty();
  }

  addToCard(where: 'front' | 'back' | 'hiddenText', toAdd: string) {
    if (this.currentCard.front === '' && this.currentCard.back === '') {
      this.currentCard.page = this.page;
      this.chapter = this.getOutlineForPage(this.page);
    }

    this.currentCard.chapter =
      this.currentCard.chapter || this.getOutlineForPage(this.page);
    this.currentCard.title = this.currentCard.title || this.title;

    switch (where) {
      case 'front':
        this.currentCard.front += toAdd;
        break;
      case 'back':
        this.currentCard.back += toAdd;
        break;
      default:
        this.currentCard.hiddenText += toAdd;
        break;
    }

    this.cardComp?.cardUpdated();
  }

  @HostListener('window:resize', ['$event'])
  @HostListener('window:orientationchange', ['$event'])
  resize() {
    this.calcScaling();
  }

  @HostListener('window:keypress', ['$event'])
  keyDown(event: KeyboardEvent) {
    console.log(event)
    if (!document.activeElement || (document.activeElement !== document.body && document.activeElement.id !== 'viewerContainer')) {
      return;
    }

    if (event.key == 'c' || event.key == 'Escape') {
      this.dragging = false;
      if (!this.dataService.config.selectionOnTop) {
        this.zIndex = -1;
      }
      this.rect = { x: 0, y: 0, width: 0, height: 0 };
      this.drawRect();
    } else if (event.key == 'w') {
      if (this.frontSelected) {
        this.frontSelected = false;
      } else {
        this.finishCard();
      }
    } else if (event.key == 's') {
      console.log('sssss', this.zIndex)
      if (this.zIndex < 1) {
        this.zIndex = 1;
      } else if (!this.dataService.config.selectionOnTop) {
        this.zIndex = -1;
      }
    } else if (event.key == '1') {
      this.frontSelected = true;
    } else if (event.key == '2') {
      this.frontSelected = false;
    } else if (event.key == 'a') {
      if (this.page > 1) {
        this.page--;
      }
    } else if (event.key == 'd') {
      if (this.page < this.numPages) {
        this.page++;
      }
    }
  }
  async finishCard() {
    await this.saveCurrentCard();
    await this.nextCard();
  }

  async nextCard() {
    console.log('NEXT CARD');
    const newCard: Card = {
      localID: this.nanoid(),
      front: '',
      back: '',
      page: this.page,
      chapter: '',
      title: this.title,
      hiddenText: '',
      creationTime: Date.now(),
    };

    this.frontSelected = true;
    this.currentCard = newCard;
    this.cardComp?.cardUpdated();
  }

  mouseDown(event: MouseEvent) {
    this.createNewRect(event.pageX, event.pageY);
    this.zIndex = 1;
    return false;
  }

  touchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      this.createNewRect(event.touches[0].pageX, event.touches[0].pageY);
    }
  }

  createNewRect(x: number, y: number) {
    const currPage =
      this.pdfCanvContext[this.page].canvas.parentElement?.parentElement;
    if (currPage && this.selCanv && this.previewCanvas) {
      let currPageComp = window.getComputedStyle(currPage);
      let offsetLeft =
        parseFloat(currPageComp.getPropertyValue('margin-left')) +
        parseFloat(currPageComp.getPropertyValue('border-left-width'));
      let offsetTop =
        parseFloat(currPageComp.getPropertyValue('margin-top')) +
        parseFloat(currPageComp.getPropertyValue('border-top-width'));

      this.rect = {
        x: x - this.selCanv.nativeElement.offsetLeft,
        y: y - this.selCanv.nativeElement.offsetTop,
        width: 0,
        height: 0,
      };
      this.dragging = true;
    }
  }

  async finishRect() {
    if (
      this.selCanv &&
      this.previewCanvas &&
      this.previewContext &&
      this.context
    ) {
      this.mouseStillDown = false;
      if (!this.dragging) {
        return;
      }

      this.dragging = false;
      this.drawRect();

      if (this.rect.width != 0 && this.rect.height != 0) {
        let viewerContainerRef: HTMLElement | null =
          document.querySelector<HTMLElement>('#viewerContainer');
        let pageRef =
          this.pdfCanvContext[this.page].canvas.parentElement?.parentElement;
        if (pageRef && viewerContainerRef) {
          let pageRefStyles = window.getComputedStyle(pageRef);
          let viewerContainerRefStyles =
            window.getComputedStyle(viewerContainerRef);
          let selCanvRefStyles = window.getComputedStyle(
            this.selCanv.nativeElement
          );

          if (selCanvRefStyles && pageRefStyles && viewerContainerRefStyles) {
            let offSetLeft =
              -parseFloat(selCanvRefStyles.marginLeft) +
              pageRef.offsetLeft +
              parseFloat(pageRefStyles.borderLeftWidth) +
              parseFloat(viewerContainerRefStyles.marginLeft);
            let offSetTop =
              parseFloat(pageRefStyles.marginTop) +
              parseFloat(pageRefStyles.borderTopWidth);
            if (this.dataService.config.singlePageMode) {
            }
            let scrollPerPage = viewerContainerRef.scrollHeight / this.numPages;
            let scrollOffSet =
              viewerContainerRef.scrollTop - scrollPerPage * (this.page - 1);
            if (this.dataService.config.singlePageMode) {
              scrollOffSet = viewerContainerRef.scrollTop;
              scrollPerPage = 999999;
            }

            let data: ImageData;
            const correctedRect: Rectangle = {
              x: this.rect.x - offSetLeft + viewerContainerRef.scrollLeft,
              y: this.rect.y - offSetTop + scrollOffSet,
              width: this.rect.width,
              height: this.rect.height,
            };

            let text = this.getTextFromPosition(correctedRect);
            let annotationID : string | undefined;
            const annotationColor : string = "#fcbe8f30";
            if (scrollOffSet + this.rect.y >= scrollPerPage) {
              data = this.pdfCanvContext[this.page + 1].getImageData(
                this.rect.x * this.scale -
                  offSetLeft * this.scale +
                  viewerContainerRef.scrollLeft * this.scale,
                this.rect.y * this.scale -
                  offSetTop * this.scale +
                  (scrollOffSet - scrollPerPage) * this.scale,
                this.rect.width * this.scale,
                this.rect.height * this.scale
              );

              if (this.dataService.config.drawOnPdf) {
                // this.pdfCanvContext[this.page + 1].strokeRect(
                //   this.rect.x * this.scale -
                //     offSetLeft * this.scale +
                //     viewerContainerRef.scrollLeft * this.scale,
                //   this.rect.y * this.scale -
                //     offSetTop * this.scale +
                //     (scrollOffSet - scrollPerPage) * this.scale,
                //   this.rect.width * this.scale,
                //   this.rect.height * this.scale
                // );
                if (this.dataService.config.drawOnPdf) {
              annotationID = this.addRectAnnotation(this.page+1,annotationColor);}
              }
            } else {
              const correctedRect: Rectangle = {
                x: this.rect.x - offSetLeft + viewerContainerRef.scrollLeft,
                y: this.rect.y - offSetTop + scrollOffSet,
                width: this.rect.width,
                height: this.rect.height,
              };

              data = this.pdfCanvContext[this.page].getImageData(
                this.rect.x * this.scale -
                  offSetLeft * this.scale +
                  viewerContainerRef.scrollLeft * this.scale,
                this.rect.y * this.scale -
                  offSetTop * this.scale +
                  scrollOffSet * this.scale,
                this.rect.width * this.scale,
                this.rect.height * this.scale
              );

              if (this.dataService.config.drawOnPdf) {
                annotationID = this.addRectAnnotation(this.page,annotationColor);
              }
            }

            this.previewCanvas.nativeElement.width =
              this.rect.width * this.scale;
            this.previewCanvas.nativeElement.height =
              this.rect.height * this.scale;
            this.previewContext.putImageData(data, 0, 0);

            this.addSelection(text,annotationID,annotationColor);

            this.context.strokeStyle = 'green';
            this.drawRect();

            if (!this.dataService.config.selectionOnTop) {
              this.zIndex = -1;
            }
            setTimeout(() => {
              this.rect = { x: 0, y: 0, width: 0, height: 0 };
              if (this.context) {
                this.context.strokeStyle = 'gray';
                this.drawRect();
              }
            }, 200);
          }
        }
      }
    }
  }


  addRectAnnotation(page: number, color: string) : string | undefined{
    let bodyRect = document.body.getBoundingClientRect();
    let viewerContainerRef: HTMLElement | null =
    document.querySelector<HTMLElement>('#viewerContainer');
    if(viewerContainerRef){
    let clientRect = viewerContainerRef.getBoundingClientRect();

    var width = clientRect.width;
    var height = clientRect.height;
    let left = clientRect.left - bodyRect.left;
    let top = clientRect.top - bodyRect.top;
    console.log({top, left, width, height})
    const pdfPoints : any = [];
    const coordinates = {left: this.rect.x, right: this.rect.x + this.rect.width, top: this.rect.y + top, bottom: this.rect.y  + this.rect.height + top };
    console.log("SET:",{coordinates})
    const pdfPoint = this.getPDFPoint(coordinates);
    pdfPoints.push(pdfPoint)
    const annotations = this.annotationForPage.get(page) || [];
    const id = this.nanoid();
    const newAnnotation = {
      id: id,
      type: 'area',
      color: color,
      points: pdfPoints,
      page: page,
    };
    annotations.push(newAnnotation);
    this.annotationForPage.set(page, annotations);
    this.drawAnnotationOnPage(page, newAnnotation);
    return id;
    }
    return undefined;
  }

  mouseMove(event: MouseEvent) {
    this.mouseStillDown = false;
    if (this.dragging) {
      this.resizeRect(event.pageX, event.pageY);
    }
  }

  touchMove(event: TouchEvent) {
    this.mouseStillDown = false;

    if (event.touches.length === 1) {
      if (this.dragging) {
        event.preventDefault();
        event.stopPropagation();
        this.resizeRect(event.touches[0].pageX, event.touches[0].pageY);
      }
    }
  }

  resizeRect(pageX: number, pageY: number) {
    if (this.selCanv) {
      this.rect.width =
        pageX - this.selCanv.nativeElement.offsetLeft - this.rect.x;
      this.rect.height =
        pageY - this.selCanv.nativeElement.offsetTop - this.rect.y;
      this.drawRect();
    }
  }

  drawRect() {
    if (this.context && this.selCanv) {
      this.context.clearRect(
        0,
        0,
        this.selCanv.nativeElement.width,
        this.selCanv.nativeElement.height
      );
      this.context.setLineDash([5]);
      this.context.strokeRect(
        this.rect.x,
        this.rect.y,
        this.rect.width,
        this.rect.height
      );
    }
  }

  textLayerRendered(e: any) {
    // let strings: string[] = e.source.textContentItemsStr;
    this.textDivs[e.pageNumber] = e.source.textDivs;
  }

  async addSelection(text: string = '' , annotationId: string | undefined, color: string) {
    console.log(annotationId)
    this.saveConfig();
    if (this.previewCanvas) {
      if (this.currentCard.front === '' && this.currentCard.back === '') {
        this.currentCard.page = this.page;
        this.chapter = this.getOutlineForPage(this.page);
      }

      this.currentCard.chapter =
        this.currentCard.chapter || this.getOutlineForPage(this.page);
      this.currentCard.title = this.currentCard.title || this.title;

      let dataURL: string =
        this.previewCanvas.nativeElement.toDataURL('image/png');

      let toAdd: string = '';

      if (this.dataService.config.addImageOption) {
        if(annotationId !== undefined){
          toAdd +=
            `<div id="${environment.ANNOTATION_ON_CARD_PREFIX}${annotationId}" annotationColor="${color}"><img src="${dataURL}" alt="" id="${environment.ANNOTATION_ON_CARD_PREFIX}${annotationId}"></div><br />`;
        }else{
          toAdd +=
          `<div><img src="${dataURL}" alt=""></div><br />`;
        }
      }

      if (this.dataService.config.addTextOption && !this.dataService.config.addOcrTextOption) {
        if (this.dataService.config.addTextAsHidden) {
          this.currentCard.hiddenText += text + '\n';
        } else {
          toAdd += text;
        }
      }

      toAdd += '\n <br>';

      if (this.frontSelected) {
        this.currentCard.front += toAdd;
      } else {
        this.currentCard.back += toAdd;
      }

      let saveCardId: string = this.currentCard.localID;
      let saveFrontSel = this.frontSelected;
      if (this.dataService.config.addTextOption && this.dataService.config.addOcrTextOption) {
        this.ocrLoadingNum++;

        recognize(dataURL, this.dataService.config.ocrLanguage, {
          logger: (m) => {
            console.log(m);
          },
        }).then((tessRes) => {
          this.ocrLoadingNum--;

          let card = this.getCards().find((c) => c.localID === saveCardId);
          if (card) {
            if (this.dataService.config.addTextAsHidden) {
              card.hiddenText += tessRes.data.text + '\n';
            } else {
              if (saveFrontSel) {
                card.front += tessRes.data.text + ' <br>';
              } else {
                card.back += tessRes.data.text + ' <br>';
              }
            }
          }
        });
      }
    }
    this.cardComp?.cardUpdated();
  }

  selectionOnTopChange(newVal: any) {
    if (!this.dataService.config.selectionOnTop) {
      this.zIndex = 1;
      this.dataService.config.selectionOnTop = true;
    } else {
      this.zIndex = -1;
      this.dataService.config.selectionOnTop = false;
    }
  }

  async saveCurrentCard() {
    if (this.document) {
      const cardIndex = this.getCards().findIndex(
        (card) => card.localID === this.currentCard.localID
      );
      if(!this.dataService.offlineMode && this.dataService.config.autoAddServer){
        this.currentCard =
          (await this.cardComp?.saveToServer()) || this.currentCard;
          console.log("SEND TO CARD TO SERVER: ",this.currentCard)
      }
      console.log(cardIndex);
      if (this.cardComp) {
        if (cardIndex >= 0) {
          if (this.dataService.config.autoAddAnki) {
            await this.cardComp?.save(true);
          }
          this.getCards()[cardIndex] = (this.currentCard);
        } else if (
          this.currentCard.front != '' ||
          this.currentCard.back != '' ||
          this.currentCard.hiddenText != ''
        ) {
          if (this.dataService.config.autoAddAnki) {
            await this.cardComp?.save(true);
          }
          this.getCards().unshift(this.currentCard);
        }
        await this.saveDocument();
      }
    } else if (
      this.currentCard.front != '' ||
      this.currentCard.back != '' ||
      this.currentCard.hiddenText != ''
    ) {
      console.log("BEFORE SRV");
      if (this.dataService.config.autoAddServer) {
        this.currentCard =
          (await this.cardComp?.saveToServer()) || this.currentCard;
          console.log("AFTER SRV");
      }
      console.log("BEFORE ANKI");
      if (this.dataService.config.autoAddAnki) {
        await this.cardComp?.save(true);
      }
      console.log("AFTER ANKI");
      this.getCards().unshift(this.currentCard);
      console.log("AFTER UNSHIFT");
    }
  }

  async deleteCurrentCard() {
    this.deleteCard(this.currentCard.localID);
    this.nextCard();
  }
  async deleteCard(id: string) {
    let i = this.getCards().findIndex((c, i) => c.localID === id);
    if (i >= 0) {
      if (i === 0) {
        this.getCards().splice(i, 1);
        // await this.nextCard();
      } else {
        this.getCards().splice(i, 1);
      }
    }
    if (this.document) {
      this.saveDocument();
    }
  }

  async editCard(card: Card) {
    await this.saveCurrentCard();
    this.currentCard = card;
    this.cardComp?.cardUpdated();
  }
  getCardId(index: number, card: Card) {
    return card.localID;
  }

  getTextFromPosition(rect: Rectangle) {
    const pageRef: HTMLElement | null | undefined =
      this.pdfCanvContext[this.page].canvas.parentElement?.parentElement;

    const textLayer: Element | null | undefined =
      pageRef?.querySelector('.textLayer');

    const spans: NodeListOf<HTMLSpanElement> | null | undefined =
      textLayer?.querySelectorAll('span');

    if (pageRef && textLayer && spans) {
      let ret = '';
      spans.forEach((span) => {
        const clientRect: DOMRect = span.getBoundingClientRect();
        const x = parseFloat(span.style.left);
        const y = parseFloat(span.style.top);
        if (
          x >= rect.x &&
          x <= rect.x + rect.width &&
          y >= rect.y &&
          y <= rect.y + rect.height
        ) {
          ret += ' ' + span.textContent;
        }
      });
      return ret;
    } else {
      return '';
    }
  }

  async saveConfig() {
    const res = await this.dataService.savePrefs({ config: this.dataService.config });
  }

  async saveDocument() {
    if (this.document) {
      this.document.currentPage = this.page;
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
