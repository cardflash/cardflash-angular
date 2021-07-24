import { Component, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { IPDFViewerApplication, PageRenderedEvent, PagesLoadedEvent } from 'ngx-extended-pdf-viewer';
import { CardComponent } from '../../card/card.component';
import { Card } from '../../types/card';
import { Config } from '../../types/config';
import { Rectangle } from '../../types/rectangle';
import { customAlphabet } from 'nanoid';
import { DataService } from '../../data.service';
import {recognize} from 'tesseract.js';
import { TesseractLanguages } from '../../data/tesseract-languages';

@Component({
  selector: 'app-from-pdf',
  templateUrl: './from-pdf.component.html',
  styleUrls: ['./from-pdf.component.scss']
})
export class FromPdfComponent implements OnInit {
  pdfSrc = '/assets/pdfs/flashcards_siter_eu.pdf';
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
  
  //cards
  public cards: Card[] = [
    { localID: this.nanoid(), front: '', back: '', page: this.page, hiddenText: '', chapter: '', title: '' },
  ];
  
  public currIndex = 0;
  public frontSelected: boolean = true;
  
  public scale: number = 1;
  public sidebarVisible: boolean = false;
  
  public ocrLoadingNum: number = 0;
  
  
  public config : Config =  DataService.DEFAULT_CONFIG;
  
  public disablePDFViewer : boolean = false;
  private pdfOutline: { page: number; title: string }[] = [];
  
  
  private mouseStillDown : boolean = false;
  
  public title : string = "";
  public titleOptions : string[] = [];
  public chapter : string = "";
  
  public readonly OCR_LANGUAGES  : {short: string, long: string}[] = TesseractLanguages.LANGS;
  
  @ViewChildren(CardComponent) cardCompList?: QueryList<CardComponent>;
  
  constructor(public dataService: DataService){
  
  }
  async ngOnInit() {
    this.dataService.init().then(()=> {
      this.config = this.dataService.prefs['config'];
    })
  }
  
  async ngAfterViewInit() {
    if(this.selCanv){
      const context = this.selCanv.nativeElement.getContext('2d');
      if(context != null){
        this.context = context;
        this.context.strokeStyle = 'gray';
        this.context.lineWidth = 1.5;
        this.context.setLineDash([5]);
      }
      this.selCanv.nativeElement.addEventListener("touchstart",this.touchStart.bind(this),{passive: false, capture: true});
      this.selCanv.nativeElement.addEventListener("touchmove",this.touchMove.bind(this),{passive: false, capture: true});
  
      const previewContext = this.previewCanvas?.nativeElement.getContext('2d');
      if(previewContext){
        this.previewContext = previewContext;
      }
    }
    let viewerContainerRef: HTMLElement | null = document.querySelector<HTMLElement>(
      '#viewerContainer'
    );
    if(viewerContainerRef){
    viewerContainerRef.oncontextmenu = this.mouseDown.bind(this);
    viewerContainerRef.onmousemove = this.mouseMove.bind(this);
    viewerContainerRef.onmouseup = this.finishRect.bind(this);
    viewerContainerRef.onkeydown = this.keyDown.bind(this);
    }
    this.calcScaling();
  }
  
  async loadComplete(e: PagesLoadedEvent) {
    this.numPages = e.pagesCount;
    this.page = 1;
    this.pdfApplication = (window as any).PDFViewerApplication;
    console.log(this.pdfApplication);
    this.titleOptions = [];
    const pdfTitle = (this.pdfApplication as any).documentInfo?.Title
    if(pdfTitle){
      this.titleOptions.push(pdfTitle);
      this.title = pdfTitle;
    }
    const files = this.fileSelector?.nativeElement.files;
    if(files && files.length >= 1){
      const fileTitle = files[0].name;
      this.titleOptions.push(fileTitle.replace(".pdf",""));
      if(!this.title){
        this.title = fileTitle;
      }
    }
    console.log(this.titleOptions)
    
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
  }
  
  async addToPdfOutline(
    dest: any,
    title: string,
    items: { dest: any; title: string; items: [] }[]
  ) {
    if(!dest){return;}
    if (typeof dest === 'string') {
      dest = await this.pdfApplication?.pdfDocument.getDestination(dest); // returns array, index 0 is ref
    }
    if ((!('num' in dest) || !('gen' in dest))) {
      dest = dest[0];
    }
    const pageIndex: number = await this.pdfApplication?.pdfDocument.getPageIndex(
      dest
    ); //returns pageNr-1
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
    let sidebarRef: HTMLElement | null = document.querySelector<HTMLElement>(
      '#sidebarContent'
    );
    let viewerContainerRef: HTMLElement | null = document.querySelector<HTMLElement>(
      '#viewerContainer'
    );
  
    if(sidebarRef && viewerContainerRef && this.selCanv && this.context){
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
        this.pdfSrc = e.target.result;
      };
  
    const files = this.fileSelector?.nativeElement.files;
    if(files && files.length >= 1){
      reader.readAsArrayBuffer(files[0]);
    }
    }
  }
  
  pageRendered(e: PageRenderedEvent) {
    let pdfCanv: HTMLCanvasElement = e.source.canvas;
    if(this.pdfCanvContext){
      const pageCanvContext = pdfCanv.getContext('2d');
      if(pageCanvContext){
        this.pdfCanvContext[e.pageNumber] = pageCanvContext
        this.calcScaling();
      }
  
    }
  }
  
  @HostListener('window:resize', ['$event'])
  @HostListener('window:orientationchange', ['$event'])
  resize() {
    this.calcScaling();
  }
  
  @HostListener('window:keydown', ['$event'])
  keyDown(event: KeyboardEvent) {
    if (document.activeElement !== document.body) {
      return;
    }
  
    if (event.key == 'c' || event.key == 'Escape') {
      this.dragging = false;
      if (!this.config.selectionOnTop) {
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
      if(this.zIndex < 1){
        this.zIndex = 1;
      }else if (!this.config.selectionOnTop) {
          this.zIndex = -1;
      }
    } else if (event.key == '1') {
      this.frontSelected = true;
    } else if (event.key == '2') {
      this.frontSelected = false;
    }else if(event.key == 'a'){
      if(this.page > 1){
        this.page--;
      }
    }else if(event.key == 'd'){
      if(this.page < this.numPages){
        this.page++;
      }
    }
  }
  finishCard() {
    if (this.config.autoAddAnki) {
      if(this.cardCompList){
        this.cardCompList
        .filter((cc: CardComponent) => cc.active)
        .forEach((cc: CardComponent) => cc.save(true));
      }
    }
    this.nextCard();
  }
  
  nextCard(){
    this.cards.unshift({
      localID: this.nanoid(),
      front: '',
      back: '',
      page: this.page,
      chapter: '',
      title: this.title,
      hiddenText: ''
    });
    this.currIndex = 0;
    this.frontSelected = true;
  }
  
  mouseDown(event: MouseEvent) {
    //event.preventDefault();
    //event.stopPropagation();
    //event.stopImmediatePropagation();
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
    const currPage = this.pdfCanvContext[this.page].canvas.parentElement?.parentElement;
    if(currPage && this.selCanv && this.previewCanvas){
  
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
    if(this.selCanv && this.previewCanvas && this.previewContext && this.context){
    this.mouseStillDown = false;
    if (!this.dragging) {
      return;
    }
  
    this.dragging = false;
    this.drawRect();
  
    if (this.rect.width != 0 && this.rect.height != 0) {
      let viewerContainerRef: HTMLElement | null = document.querySelector<HTMLElement>(
        '#viewerContainer'
      );
      let pageRef = this.pdfCanvContext[this.page].canvas.parentElement?.parentElement;
        if(pageRef && viewerContainerRef){
  
          let pageRefStyles = window.getComputedStyle(pageRef);
          let viewerContainerRefStyles = window.getComputedStyle(
            viewerContainerRef
          );
          let selCanvRefStyles = window.getComputedStyle(
            this.selCanv.nativeElement
          );
  
  
    if(selCanvRefStyles && pageRefStyles && viewerContainerRefStyles){
      let offSetLeft =
        -parseFloat(selCanvRefStyles.marginLeft) +
        pageRef.offsetLeft +
        parseFloat(pageRefStyles.borderLeftWidth) +
        parseFloat(viewerContainerRefStyles.marginLeft);
      let offSetTop =
        parseFloat(pageRefStyles.marginTop) +
        parseFloat(pageRefStyles.borderTopWidth);
  
      // let data :ImageData = this.pdfCanvContext[this.page].getImageData(
      //                         this.rect.x*this.scale - offSetLeft*this.scale + viewerContainerRef.scrollLeft*this.scale,
      //                         this.rect.y*this.scale - offSetTop*this.scale + viewerContainerRef.scrollTop*this.scale,
      //                         this.rect.width*this.scale,this.rect.height*this.scale);
  
      // this.pdfCanvContext[this.page].strokeRect(this.rect.x*this.scale - offSetLeft*this.scale + viewerContainerRef.scrollLeft*this.scale,
      //                                         this.rect.y*this.scale - offSetTop*this.scale + viewerContainerRef.scrollTop*this.scale,
      //                                         this.rect.width*this.scale,this.rect.height*this.scale);
      if(this.config.singlePageMode){}
      let scrollPerPage = viewerContainerRef.scrollHeight / this.numPages;
      let scrollOffSet =
        viewerContainerRef.scrollTop - scrollPerPage * (this.page - 1);
        if(this.config.singlePageMode){
          scrollOffSet =viewerContainerRef.scrollTop;
          scrollPerPage = 999999;
        }
      //   const pdfDocument = this.pdfApplication.pdfDocument;
      // let heightSum = 0;
      //   for(let i = 1; i < this.page; i++){
      //     const page = await pdfDocument.getPage(i);
      //     console.log(page);
      //     heightSum += page.view[3];
      //   }
      // console.log( scrollPerPage * (this.page - 1))
      // console.log(heightSum);
      let data: ImageData;
      const correctedRect: Rectangle = {
        x: this.rect.x - offSetLeft + viewerContainerRef.scrollLeft,
        y: this.rect.y - offSetTop + scrollOffSet,
        width: this.rect.width,
        height: this.rect.height,
      };
  
      let text = this.getTextFromPosition(correctedRect);
  
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
  
        if (this.config.drawOnPdf) {
          this.pdfCanvContext[this.page + 1].strokeRect(
            this.rect.x * this.scale -
              offSetLeft * this.scale +
              viewerContainerRef.scrollLeft * this.scale,
            this.rect.y * this.scale -
              offSetTop * this.scale +
              (scrollOffSet - scrollPerPage) * this.scale,
            this.rect.width * this.scale,
            this.rect.height * this.scale
          );
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
  
        if (this.config.drawOnPdf) {
          this.pdfCanvContext[this.page].strokeRect(
            this.rect.x * this.scale -
              offSetLeft * this.scale +
              viewerContainerRef.scrollLeft * this.scale,
            this.rect.y * this.scale -
              offSetTop * this.scale +
              scrollOffSet * this.scale,
            this.rect.width * this.scale,
            this.rect.height * this.scale
          );
        }
      }
  
      this.previewCanvas.nativeElement.width = this.rect.width * this.scale;
      this.previewCanvas.nativeElement.height = this.rect.height * this.scale;
      this.previewContext.putImageData(data, 0, 0);
  
      this.addSelection(text);
  
      this.context.strokeStyle = 'green';
      this.drawRect();
  
      if (!this.config.selectionOnTop) {
        this.zIndex = -1;
      }
      setTimeout(() => {
        this.rect = { x: 0, y: 0, width: 0, height: 0 };
        if(this.context){
          this.context.strokeStyle = 'gray';
          this.drawRect();
        }
      }, 200);
    }
  }
  }
  }
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
    if(this.selCanv){
    this.rect.width =
      pageX - this.selCanv.nativeElement.offsetLeft - this.rect.x;
    this.rect.height =
      pageY - this.selCanv.nativeElement.offsetTop - this.rect.y;
    this.drawRect();
  }
  }
  
  drawRect() {
    if(this.context && this.selCanv){
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
    let strings: string[] = e.source.textContentItemsStr;
    this.textDivs[e.pageNumber] = e.source.textDivs;
    // for (let i = 0; i < strings.length; i++) {
    //   let s = strings[i];
    //   if(this.regex.test(s)){
    //     this.getCanvas();
    //   }
  
    // }
  }
  
  async addSelection(text: string = '') {
    this.saveConfig();
    if(this.previewCanvas){
    if (
      this.cards[this.currIndex].front === '' &&
      this.cards[this.currIndex].back === ''
    ) {
      this.cards[this.currIndex].page = this.page; this.chapter = this.getOutlineForPage(this.page);
    }
  
    this.cards[this.currIndex].chapter = this.cards[this.currIndex].chapter || this.getOutlineForPage(this.page);
    this.cards[this.currIndex].title = this.cards[this.currIndex].title ||this.title;
   
  
  
    let dataURL: string = this.previewCanvas.nativeElement.toDataURL(
      'image/png'
    );
    let saveIndex = this.currIndex;
  
    let toAdd: string = '';
  
    if (this.config.addImageOption) {
      toAdd += '<figure class="image"><img src="' + dataURL + '"alt=""></figure>\n';
    }
  
    if (this.config.addTextOption && !this.config.addOcrTextOption) {
      if (this.config.addTextAsHidden) {
        this.cards[this.currIndex].hiddenText += text + "\n";
      } else {
        toAdd += text;
      }
    }
  
    toAdd += '\n <br>';
  
    if (this.frontSelected) {
      this.cards[this.currIndex].front += toAdd;
    } else {
      this.cards[this.currIndex].back += toAdd;
    }
  
    let saveCardId: string = this.cards[this.currIndex].localID;
    let saveFrontSel = this.frontSelected;
    if (this.config.addTextOption && this.config.addOcrTextOption) {
      this.ocrLoadingNum++;
  
      recognize(dataURL, this.config.ocrLanguage, {
        logger: (m) => {
          console.log(m);
        },
      }).then((tessRes) => {
        this.ocrLoadingNum--;
  
        let card = this.cards.find((c) => c.localID === saveCardId);
        if(card){
        if (this.config.addTextAsHidden) {
          card.hiddenText += tessRes.data.text + "\n";
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
  }
  
  selectionOnTopChange(newVal: any) {
    
    if (!this.config.selectionOnTop) {
      this.zIndex = 1;
      this.config.selectionOnTop = true;
    } else {
      this.zIndex = -1;
      this.config.selectionOnTop = false;
    }
  }
  
  deleteCard(id: string) {
    let i = this.cards.findIndex((c,i) => c.localID === id);
    if(i >= 0){
        if (i === 0) {
          this.cards.splice(i, 1);
          this.nextCard();
        } else {
          this.cards.splice(i, 1);
          this.currIndex = 0;
        }
    }
  }
  getCardId(index: number, card: Card) {
    return card.localID;
  }
  
  getTextFromPosition(rect: Rectangle) {
    const pageRef: HTMLElement | null | undefined = this.pdfCanvContext[this.page].canvas.parentElement?.parentElement;
  
    const textLayer: Element | null | undefined = pageRef?.querySelector('.textLayer');
  
    const spans: NodeListOf<HTMLSpanElement> | null | undefined = textLayer?.querySelectorAll(
      'span'
    );
  
    if(pageRef && textLayer && spans){
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
  }else{
    return '';
  }
  }
  
  async saveConfig(){
    const res = await this.dataService.savePrefs({config: this.config});
    // this.dataService.set('config',JSON.stringify(this.config)).then((res) => {
  
    // }).catch((err) => {
    //   console.log("Error saveConfig ",err);
    // })
  }
  
  
  }
  