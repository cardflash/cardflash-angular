import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-static-card-side',
  templateUrl: './static-card-side.component.html',
  styleUrls: ['./static-card-side.component.scss']
})
export class StaticCardSideComponent implements OnInit {


  
  @Input('name') public name: string = "";
  
  @Input('content') public content: string = "";
  
  constructor() { }

  ngOnInit(): void {
  }


}
