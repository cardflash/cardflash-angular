import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-static-card-side',
  templateUrl: './static-card-side.component.html',
  styleUrls: ['./static-card-side.component.scss']
})
export class StaticCardSideComponent implements OnInit {


  
  @Input('name') public name: string = "";
  
  public safeContent : SafeHtml = '';
  @Input('content') set content(value: string){
    this.safeContent = this.domSanitizer.bypassSecurityTrustHtml(value)
  }

  

  constructor(private domSanitizer: DomSanitizer) {
  }

  ngOnInit(): void {
  }


}
