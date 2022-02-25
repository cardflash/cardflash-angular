import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { timeStamp } from 'console';

export interface FabOption {id: string, icon: string, color?: string};

@Component({
  selector: 'app-fab-expand-button',
  templateUrl: './fab-expand-button.component.html',
  styleUrls: ['./fab-expand-button.component.scss']
})
export class FabExpandButtonComponent implements OnInit, AfterViewInit {
  private showContent: boolean =false;

  @Input('defaultID')
  public defaultOption?:  FabOption

  @Input('options')
  public options:  FabOption[] = []

  @Output('selectedChange')
  public selectedOptionChange: EventEmitter<FabOption> = new EventEmitter<FabOption>();

  @Input('selected')
  public selectedOption: FabOption = this.defaultOption || {id: 'menu', icon: 'menu'};
  constructor() { }

  @ViewChild('fabContainer')
  private fabContainer?: ElementRef<HTMLDivElement>;

  @Input('forceExpandToTop')
  public forceExpandToTop: boolean = false;

  public expandToTop: boolean = false;
  ngOnInit(): void {
    if(this.forceExpandToTop){
      this.expandToTop = true;
    }
  }

  ngAfterViewInit(): void {
  }

  getShowContent(){
    return this.showContent;
  }

  mainButtonClick(){
    if(!this.forceExpandToTop && this.fabContainer){
      const fabTop = this.fabContainer.nativeElement.getBoundingClientRect().top;
      const docHeight = document.body.clientHeight;
      this.expandToTop = (fabTop/docHeight) > 0.5;
    }
    this.showContent = !this.showContent;
  }

  blur(){
    console.log('blur')
    this.showContent = false;
    if(!this.forceExpandToTop){
      this.expandToTop = false;
    }
  }

  delayedBlur(){
    setTimeout(() => {
      this.blur();
    },200)
  }

  contentButtonClick(index: number){
    this.selectedOption = this.options[index];
    this.selectedOptionChange.emit(this.selectedOption)
    this.blur();
  }

  divBlur(event: FocusEvent){
    console.log('divBlur',{event})
    if(event.relatedTarget){
      console.log(event.relatedTarget)
      if((event.relatedTarget as HTMLElement).classList.contains('fabExpandContentButton')){

      }else{
        this.blur();
      }
    }else{
      this.blur();

    }
    console.log(event.relatedTarget)
  }

  closeButtonClick(){
    if(this.defaultOption){
      this.selectedOption = this.defaultOption;
      this.selectedOptionChange.emit(this.defaultOption);
      this.blur();
    }
  }

}
