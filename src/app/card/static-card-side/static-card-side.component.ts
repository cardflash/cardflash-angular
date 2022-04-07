import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-static-card-side',
  templateUrl: './static-card-side.component.html',
  styleUrls: ['./static-card-side.component.scss']
})
export class StaticCardSideComponent implements OnInit, AfterViewInit, OnChanges {

  @ViewChild('innerCardContent')
  public innerCardContent?: ElementRef<HTMLDivElement>;

  
  @Input('name') public name: string = "";
  
  public safeContent : SafeHtml = '';
  @Input('content') set content(value: string){
    const cleanContent = DOMPurify.sanitize(value,{ADD_DATA_URI_TAGS: ['img', 'a'],ALLOW_UNKNOWN_PROTOCOLS: true,});
    this.safeContent = this.domSanitizer.bypassSecurityTrustHtml(cleanContent)
  }

  

  constructor(private domSanitizer: DomSanitizer) {
  }
  
  ngOnInit(): void {
  }  
  
  ngAfterViewInit(): void {
    this.renderMath();
  }

  ngOnChanges(): void {
    setTimeout(() => {
      this.renderMath();
    },0)
  }

  renderMath(){
    if(this.innerCardContent?.nativeElement){
    (window as any).renderMathInElement(this.innerCardContent?.nativeElement);
  }
}
}
