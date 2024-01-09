import { KeyValue } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { imgSrcToBlob } from 'blob-util';
import { customAlphabet } from 'nanoid';
import { PageRenderedEvent, IPDFViewerApplication } from 'ngx-extended-pdf-viewer';
import { environment } from 'src/environments/environment';
import { CardComponent } from '../card/card.component';
import { FlipCardComponent } from '../card/flip-card/flip-card.component';
import { DocumentEntry, DataApiService, CardEntryContent, CardEntry } from '../data-api.service';
import { FabOption } from '../fab-expand-button/fab-expand-button.component';
import { UserNotifierService } from '../services/notifier/user-notifier.service';
import { Annotation } from '../types/annotation';
import { UtilsService } from '../utils.service';
import { recognize } from 'tesseract.js';

@Component({
  selector: 'app-extended-pdf',
  templateUrl: './extended-pdf.component.html',
  styleUrls: ['./extended-pdf.component.scss'],
})
export class ExtendedPdfComponent implements OnInit {
  public currPageNumber: number = 1;
  public pdfSrc: string = '/assets/pdfs/cardflash.net.pdf';

  public ocrLoadingNum: number = 0;

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

  public viewMode: 'pdf' | 'cards' | 'both' = 'both';

  public currentLeaderLines: Map<string, any> = new Map<string, any>();
  public currentLineDrawerInterval: NodeJS.Timeout | undefined;

  public areaSelectWithNormalMouse: boolean = false;

  public isCurrentlySelectingArea: boolean = false;

  private pdfOutline: { page: number; title: string }[] = [];

  public frontPlaceholder = '';
  public backPlaceholder = '';
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
  public flipCardChilds?: QueryList<FlipCardComponent>;

  public cards: CardEntry[] = [];

  public busy: boolean = false;

  public isTouchDevice: boolean = false;

  public readonly cardOptions: FabOption[] = [
    { id: 'front', icon: 'flip_to_front', title: 'Front' },
    { id: 'back', icon: 'flip_to_back', title: 'Back' },
    { id: 'none', icon: 'browser_not_supported', title: 'Do not add' },
  ];

  public cardOption: FabOption = this.cardOptions[0];

  constructor(
    public utils: UtilsService,
    public dataApi: DataApiService,
    private actRoute: ActivatedRoute,
    private router: Router,
    private userNotifier: UserNotifierService
  ) {
    this.documentid = actRoute.snapshot.params.id;
    this.utils.annotationColorOptions = [{ id: '#45454500', icon: 'text_fields' }];
    for (const color of utils.availableAnnotationColors) {
      this.utils.annotationColorOptions.push({
        color: color.hex.substring(0, 7),
        id: color.hex,
        icon: 'circle',
      });
    }
    if (dataApi.config.areaSelectOnlyText) {
      this.utils.selectedAddAreaOption = { id: 'text', icon: 'text_snippet' };
    }
  }

  ngOnInit(): void {
    if (this.documentid) {
      this.busy = true;
      this.dataApi
        .getDocument(this.documentid)
        .then((res) => {
          this.document = res;
          this.loadFromDoc(res);
        })
        .catch(async (reason) => {
          await this.userNotifier.notify(
            'Loading Document failed',
            'Please make sure you have selected the correct provider in the options inside the left side panel. ' +
              (reason || ''),
            'danger'
          );
        });
    } else {
      this.frontPlaceholder =
        'Create some annotation and drag them here to insert them into the card.';
      this.backPlaceholder =
        'Annotations can be created by selecting text in the PDF or using the area selection tool on the bottom left. Clicking on a annotation shows you where it is used and where it came from.';
      this.annotationForPage = new Map<number, Annotation[]>([
        [
          1,
          [
            {
              id: '7xCpXXBkkl',
              type: 'highlight',
              color: '#f3ea504f',
              points: [[84.2125000982657, 975.1113453159571, 393.798635172191, 908.6439784738517]],
              page: 1,
              text: 'Blazingly fast',
            },
            {
              id: 'sy9qkty14B',
              type: 'highlight',
              color: '#5ef98c4f',
              points: [
                [482.54486740902195, 217.99875682176042, 578.6763814100041, 184.76507340070765],
              ],
              page: 1,
              text: 'Annotate',
            },
            {
              id: 'VRbhCwAxNz',
              type: 'highlight',
              color: '#f95ef34f',
              points: [
                [482.54486740902195, 106.93267753170636, 665.4121834502813, 73.6989941106536],
              ],
              page: 1,
              text: 'create flashcards',
            },
          ],
        ],
        [
          2,
          [
            {
              id: 'V8dz6a2PJS',
              type: 'highlight',
              color: '#5eacf94f',
              points: [
                [289.91259128329096, 102.70664590238174, 552.0689175495402, 52.24068218893149],
              ],
              page: 2,
              text: 'Documentation',
            },
          ],
        ],
      ]);
    }
    this.isTouchDevice = window.matchMedia('(any-hover: none)').matches;
    const smallScreen = window.matchMedia('(max-width: 800px)').matches;
    if (smallScreen) {
      this.viewMode = 'pdf';
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

    // setInterval(() => {
    //   if(this.areaSelection){
    //     this.areaSelection.nativeElement.style.left = this.getMin(this.rect.x1, this.rect.x2) + 'px';
    //     this.areaSelection.nativeElement.style.top = this.getMin(this.rect.y1, this.rect.y2) + 'px';
    //     this.areaSelection.nativeElement.style.width = this.getAbs(this.rect.x1 - this.rect.x2) + 'px';
    //     this.areaSelection.nativeElement.style.height = this.getAbs(this.rect.y1 - this.rect.y2) + 'px';
    //   }

    // },10)
  }

  ngOnDestroy(): void {
    for (const k of this.currentLeaderLines.keys()) {
      this.removeLeaderLinesForAnnotation(k);
    }
  }

  async loadFromDoc(doc: DocumentEntry) {
    if (doc) {
      this.frontPlaceholder = '';
      this.backPlaceholder = '';
      this.document = doc;
      this.currPageNumber = doc.currentPage;
      const src = (await this.dataApi.getFileView(this.document?.fileid)).href;
      console.log({ src });
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
                // touch-selections often trigger popup to copy text etc ABOVE
                // so if the device is touch, show the selectionTools below instead of above!
                if (this.isTouchDevice) {
                  this.selectionTools.nativeElement.style.top = bounds.bottom + 50 + 'px';
                } else {
                  this.selectionTools.nativeElement.style.top = bounds.top - 50 + 'px';
                }
                // 100px is around half of the width of the complete
                // try to position the toolbar in the middle on top of the selected text
                this.selectionTools.nativeElement.style.left =
                  bounds.left - 100 + (bounds.right - bounds.left) / 2 + 'px';
                const button = this.selectionTools.nativeElement.querySelector<HTMLButtonElement>('#selectionToolsAddButton');
                button?.focus();
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
    let pdfCanv: HTMLCanvasElement = e.source.canvas!;
    if (!this.isTouchDevice) {
      e.source.div.oncontextmenu = (event: any) => this.contextMenuOnPage(event, e.source.div);
    }
    e.source.div.onmousedown = (event: any) => this.mouseDownOnPage(event, e.source.div);
    if ('ontouchstart' in e.source.div) {
      e.source.div.ontouchstart = (event: any) => this.mouseDownOnPage(event, e.source.div);
    }
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

  mouseDownOnPage(e: MouseEvent | TouchEvent, pageEl: HTMLDivElement) {
    if (this.areaSelectWithNormalMouse) {
      console.log('areaSelectWithNormalMouse', { e }, { pageEl });
      this.areaSelectWithNormalMouse = false;
      this.startAreaSelection(e, pageEl);
    }
  }

  contextMenuOnPage(e: MouseEvent, pageEl: HTMLDivElement) {
    if (!this.getSelection()) {
      console.log('contextMenuOnPage', { e }, { pageEl });
      this.startAreaSelection(e, pageEl);
    }
  }

  startAreaSelection(e: MouseEvent | TouchEvent, pageEl: HTMLDivElement) {
    pageEl
      .querySelectorAll('*')
      .forEach((e) => e instanceof HTMLElement && (e.style.cursor = 'crosshair'));
    e.preventDefault();
    if (e instanceof MouseEvent) {
      this.rect.x1 = e.x;
      this.rect.y1 = e.y;
      this.rect.x2 = e.x;
      this.rect.y2 = e.y;
    } else {
      if (e.touches.length >= 0) {
        this.rect.x1 = e.touches[0].clientX;
        this.rect.y1 = e.touches[0].clientY;
        this.rect.x2 = e.touches[0].clientX;
        this.rect.y2 = e.touches[0].clientY;
      }
    }
    this.isCurrentlySelectingArea = true;

    pageEl.onmouseup = (event: any) => this.mouseUpOnPage(event, pageEl);
    pageEl.onmousemove = (event: any) => this.mouseMoveOnPage(event, pageEl);
    if ('ontouchmove' in pageEl && 'ontouchend' in pageEl) {
      pageEl.ontouchmove = (event: any) => this.touchMoveOnPage(event, pageEl);
      pageEl.ontouchend = (event: any) => this.mouseUpOnPage(event, pageEl);
    }
  }

  mouseMoveOnPage(e: MouseEvent, pageEl: HTMLDivElement) {
    this.rect.x2 = e.x;
    this.rect.y2 = e.y;
  }

  touchMoveOnPage(e: TouchEvent, pageEl: HTMLDivElement) {
    if (e.touches.length >= 1 && this.isCurrentlySelectingArea) {
      this.rect.x2 = e.touches[0].clientX;
      this.rect.y2 = e.touches[0].clientY;
    }
  }

  mouseUpOnPage(e: MouseEvent | TouchEvent, pageEl: HTMLDivElement | null) {
    this.isCurrentlySelectingArea = false;
    if (pageEl) {
      if (pageEl.removeAllListeners) {
        console.log('REMOVING ALL LISTENERS');
        pageEl.removeAllListeners('mousemove');
        pageEl.removeAllListeners('mouseup');
        pageEl.removeAllListeners('ontouchmove');
        pageEl.removeAllListeners('ontouchend');
      }
      pageEl.onmouseup = null;
      pageEl.onmousemove = null;
      if ('ontouchmove' in pageEl && 'ontouchend' in pageEl) {
        pageEl.ontouchend = null;
        pageEl.ontouchmove = null;
      }
    }
    if(this.areaSelection){
      const button = this.areaSelection.nativeElement.querySelector<HTMLButtonElement>('#areaSelectionAddButton');
      button?.focus();
    }

    pageEl?.querySelectorAll('*').forEach((e) => e instanceof HTMLElement && (e.style.cursor = ''));
  }

  @HostListener('window:keypress', ['$event'])
  handleShortCut(event: KeyboardEvent){
    if(event.target === document.body || event.target instanceof HTMLButtonElement){
      console.log({event})

      switch(event.key){
        case '1':
          this.cardOption = this.cardOptions[0]
          break;
        case '2':
          this.cardOption = this.cardOptions[1]
          break;
        case 'w':
          if(this.cardOption.id === 'front'){
            this.cardOption = this.cardOptions[1];
          }else{
            this.finishCard()
          }
          break;
        case 's':
          this.areaSelectWithNormalMouse = !this.areaSelectWithNormalMouse;
          break;
      }
      if(event.key === '1'){
  
      }
    }  
    // (keydown.1)="this.cardOption = this.cardOptions[0]"
    // (keydown.2)="this.cardOption = this.cardOptions[1]"
    // (keydown.w)="this.cardOption.id === 'front' ? (this.cardOption = this.cardOptions[1]) : (this.nextCard())"
    // (keydown.s)="this.areaSelectWithNormalMouse = !this.areaSelectWithNormalMouse"
  }

  async closeAreaSelection() {
    console.log('Area selection ended: ', this.rect);
    this.isCurrentlySelectingArea = false;
    this.rect.x1 = 0;
    this.rect.y1 = 0;
    this.rect.x2 = 0;
    this.rect.y2 = 0;
  }

  getSortedRect(rect: { x1: number; x2: number; y1: number; y2: number }) {
    const x_min = this.getMin(rect.x1, rect.x2);
    const y_min = this.getMin(rect.y1, rect.y2);
    const x_max = this.getMax(rect.x1, rect.x2);
    const y_max = this.getMax(rect.y1, rect.y2);
    return { x1: x_min, x2: x_max, y1: y_min, y2: y_max };
  }

  trackByAnnotationForPage(index: number, a: KeyValue<number, Annotation[]>) {
    return a.key;
  }

  trackByAnnotation(index: number, a: Annotation) {
    return a.id;
  }

  async addAreaSelection(rect: { x1: number; x2: number; y1: number; y2: number }) {
    const sortedRect = this.getSortedRect(this.rect);
    const pdfPoint = this.getPDFPoint({
      left: sortedRect.x1,
      right: sortedRect.x2,
      top: sortedRect.y1,
      bottom: sortedRect.y2,
    });
    if (pdfPoint) {
      let page = this.currPageNumber;
      let pageDetected = this.getPageNumberFromPoint(rect.x1, rect.y1);
      if (pageDetected) {
        page = pageDetected;
      } else {
        console.log('no page detected');
      }
      const id = this.nanoid();
      const newAnnotation: Annotation = {
        id: id,
        type: 'area',
        color: '#ffa62170',
        points: [pdfPoint],
        page: page,
      };
      this.closeAreaSelection();

      let text = this.getTextFromPosition(sortedRect, page);
      const imgSrc = this.getImageFromSelection(sortedRect, page);
      if(this.dataApi.config.enableOCR && imgSrc){
        try{
          this.ocrLoadingNum++
          const res = await recognize(imgSrc,this.dataApi.config.ocrLanguage);
          if(res.data.text){
            text = res.data.text;
          }
        }catch(e){
          console.log(e)
        }
        this.ocrLoadingNum--;
      }else if(text === "" && this.utils.selectedAddAreaOption.id === 'text'){
        this.userNotifier.notify("OCR","No text detected. Consider enabling OCR in the sidepanel. Do not forget to select the correct OCR language.","",true)
      }
      console.log({text});
      if (this.utils.selectedAddAreaOption.id === 'text') {
        newAnnotation.text = text;
      } else {
        newAnnotation.hiddenText = text;
        // const imgSrc = this.getImageFromSelection(sortedRect, page);
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
    } else {
      this.closeAreaSelection();
    }
  }

  getImageFromSelection(
    rect: { x1: number; x2: number; y1: number; y2: number },
    pageNumber: number
  ): string | undefined {
    const page = this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1];
    const canvasRect = (page.canvas as HTMLCanvasElement).getBoundingClientRect();
    const context: CanvasRenderingContext2D = page.canvas!.getContext('2d')!;
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
    if (pageRef && spans && pageRect) {
      let ret = '';
      spans.forEach((span) => {
        const x = parseFloat(getComputedStyle(span).left) + pageRect.left;
        const y = parseFloat(getComputedStyle(span).top) + pageRect.top;
        if (x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2) {
          ret += ' ' + span.textContent;
        }
      });
      return ret;
    } else {
      return '';
    }
  }

  areaCornerMouseDown(corner: number, e: MouseEvent | TouchEvent) {
    console.log({ corner, e });
    this.rect = this.getSortedRect(this.rect);
    const updateFunction = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();
      document.getSelection()?.empty();
      console.log('onmousemove', { event });
      let x = 0,
        y = 0;
      if (event instanceof MouseEvent) {
        x = event.x;
        y = event.y;
      } else {
        if (event.touches.length >= 0) {
          x = event.touches[0].clientX;
          y = event.touches[0].clientY;
        }
      }
      if (corner === 1) {
        this.rect.x1 = x;
        this.rect.y1 = y;
      } else if (corner === 2) {
        this.rect.x2 = x;
        this.rect.y1 = y;
      } else if (corner === 3) {
        this.rect.x1 = x;
        this.rect.y2 = y;
      } else if (corner === 4) {
        this.rect.x2 = x;
        this.rect.y2 = y;
      } else if (corner === -1) {
        this.rect.x1 = x;
      } else if (corner === -2) {
        this.rect.y1 = y;
      } else if (corner === -3) {
        this.rect.x2 = x;
      } else if (corner === -4) {
        this.rect.y2 = y;
      }
    };
    document.onmousemove = updateFunction;
    document.ontouchmove = updateFunction;
    document.onmouseup = (event) => {
      event.preventDefault();
      console.log('onmouseup', { event });
      document.onmousemove = null;
      document.ontouchmove = null;
      document.onmouseup = null;
    };
    document.ontouchend = (event) => {
      event.preventDefault();
      console.log('onmouseup', { event });
      document.onmousemove = null;
      document.ontouchmove = null;
      document.ontouchend = null;
    };
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

  addHighlightForSelection(colorHex = '#45454500', pageNumber: number = this.currPageNumber) {
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
        color: colorHex,
        points: pdfPoints,
        page: pageNumber,
        text: this.getSelection(),
      };
      this.addAnnotation(newAnnotation);
      document.getSelection()?.empty();
    }
  }

  addAnnotation(newAnnotation: Annotation) {
    if (this.cardOption.id === 'front' || this.cardOption.id === 'back') {
      this.addAnnotationToCard(newAnnotation, this.cardOption.id);
    }
    const annotations = this.annotationForPage.get(newAnnotation.page) || [];
    annotations.push(newAnnotation);
    this.annotationAdded.emit(newAnnotation);
    this.annotationForPage.set(newAnnotation.page, annotations);
    this.drawAnnotationOnPage(newAnnotation.page, newAnnotation);
    this.saveDocument();
  }

  async addAnnotationToCard(annotation: Annotation, side: 'front' | 'back') {
    // if (this.documentid) {
    const reference = await this.utils.generateReferenceFromAnnotation(annotation, this.documentid);
    if (this.currentCard.front === '' && this.currentCard.front === '') {
      this.currentCard.title = this.document?.name || '';
      this.currentCard.chapter = this.getOutlineForPage(this.currPageNumber);
      this.currentCard.page = this.currPageNumber;
    }
    if (side === 'front') {
      this.currentCard.front += reference;
    } else {
      this.currentCard.back += reference;
    }
    // }
  }

  drawAnnotationOnPage(pageNumber: number, annotation: Annotation) {
    if (this.getPdfViewerApplication()) {
      const page = this.getPdfViewerApplication().pdfViewer._pages[pageNumber - 1];
      const context: CanvasRenderingContext2D = page.canvas!.getContext('2d')!;
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
        const bounds = this.getBoundsForAnnotations(annotation);
        const rect = viewport.convertToViewportRectangle(bounds);
        // const delDiv = document.createElement('div');
        // delDiv.setAttribute('id', environment.ANNOTATION_DEL_PREFIX + annotation.id);
        // delDiv.setAttribute('class', 'annotationToolOverlay');
        // delDiv.setAttribute('title', 'Delete annotation');
        // delDiv.setAttribute(
        //   'style',
        //   ` position: absolute;
        //     left: ${Math.max(rect[0], rect[2]) - 1}px;
        //     top: ${Math.min(rect[1], rect[3]) - 20}px;
        //     width: ${this.isTouchDevice ? 25 : 15}px;
        //     height: ${this.isTouchDevice ? 25 : 15}px;
        //     background-image: url('assets/delete.svg');`
        // );
        // delDiv.onclick = async (event: any) => {
        //   this.deleteAnnotation(annotation.id);
        // };
        // page.div.appendChild(delDiv);
        const jumpDiv = document.createElement('div');
        jumpDiv.setAttribute('id', environment.ANNOTATION_JMP_PREFIX + annotation.id);
        jumpDiv.setAttribute('class', 'annotationToolOverlay annotationJumpOverlay');
        jumpDiv.setAttribute('title', 'Scroll into view');
        jumpDiv.setAttribute(
          'style',
          ` position: absolute;
            left: ${Math.max(rect[0], rect[2]) - 1}px;
            top: ${Math.min(rect[1], rect[3]) - 5}px;
            width: ${this.isTouchDevice ? 25 : 15}px;
            height: ${this.isTouchDevice ? 25 : 15}px;
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

    if (e[0].isIntersecting && this.dataApi.config.autoDrawLines) {
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
    if (this.viewMode === 'pdf') {
      this.viewMode = 'cards';
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          resolve();
        }, 400);
      });
    } else if (this.viewMode === 'cards') {
      this.viewMode = 'pdf';
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          resolve();
        }, 400);
      });
    }
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
          minEl.scrollIntoView({ behavior: 'auto', block: 'nearest' });
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
                  this.dataApi.config.autoDrawLines &&
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
      const pageRect: any = page.canvas!.getClientRects()[0];
      let res: [number, number, number, number] = (page.viewport
        .convertToPdfPoint(clientRect.left - pageRect.x, clientRect.top - pageRect.y) as [number,number])
        .concat(
          page.viewport.convertToPdfPoint(
            clientRect.right - pageRect.x,
            clientRect.bottom - pageRect.y
          ) as [number,number]
        ) as [number,number,number,number];
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
    const canvas = page.div.querySelector('div.canvasWrapper > canvas') as HTMLCanvasElement;
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
    console.log('saving', this.annotationForPage);
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
    this.frontPlaceholder = '';
    this.backPlaceholder = '';
    const cardCopy = { ...this.currentCard };
    await this.saveCard(cardCopy);
    this.nextCard(newCard);
  }

  async saveCard(card: CardEntry | CardEntryContent) {
    if (card.front !== '' || card.back !== '') {
      const res = await this.utils.saveCard(card);
      if (res) {
        if (res.isNew) {
          this.cards.push(res.card);
          const cardIDs = this.document?.cardIDs || [];
          cardIDs.push(res.card.$id);
          if (this.document) {
            this.document.cardIDs = cardIDs;
            this.saveDocument();
          }
        }
      }
    }
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
    if (this.cardOption.id === 'back') {
      this.cardOption = this.cardOptions[1];
    }
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

  // cardOptionChange(newOption: FabOption){
  //   if(newOption.id === 'front'){
  //     this.frontSelected = true;
  //   }else if(newOption.id === 'back'){
  //     this.frontSelected = false;
  //   }else{
  //     this.dataApi.config.autoAddAnnotationsToCard = false;
  //   }
  // }
}
