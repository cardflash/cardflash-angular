import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { FlipCardComponent } from '../card/flip-card/flip-card.component';
import { CardEntry, CardEntryContent } from '../data-api.service';

@Component({
  selector: 'app-stacked-cards',
  templateUrl: './stacked-cards.component.html',
  styleUrls: ['./stacked-cards.component.scss']
})
export class StackedCardsComponent implements OnInit {

  @Input('cards')
  public cards : (CardEntry)[] = [];
  @Output('cardsChange')
  public cardsChange: EventEmitter<(CardEntry)[]> = new EventEmitter<(CardEntry)[]>();


  @ViewChildren('stackedCard')
  public stackedCards?: QueryList<ElementRef<HTMLDivElement>>;
  
  public selectedIndex: number = 0;

  public interval: NodeJS.Timeout | null = null;
  constructor() { }

  ngOnInit(): void {
  }

  trackByCardId(index: number, card: CardEntry){
    return card.$id || index;
  }

  cardDropped(event: CdkDragDrop<string[]>){ 
    console.log(event)  
    moveItemInArray(this.cards, event.previousIndex, event.currentIndex);

  }

  dragOver(event: DragEvent, index: number){
    event.preventDefault();
    // console.log(event,index)
    if(event.dataTransfer){
        event.dataTransfer.dropEffect = "move";
    }
  }

  dragStart(event: DragEvent, index: number){
    // event.preventDefault();
    if(event.dataTransfer){
      event.dataTransfer.setData("text/plain", index.toString());
    }
    console.log(event,index)
  }

  drop(event: DragEvent, index: number){
    console.log(event,index)
    event.preventDefault();
    if(event.dataTransfer){
      console.log(event.dataTransfer.getData('text/plain'), 'to', index)
      const from = parseInt(event.dataTransfer.getData('text/plain'));
      if(from >= 0 && from < this.cards.length){
        if(index < 0){
          this.cards.splice(from,1)
        }else{
          moveItemInArray(this.cards,from,index);
          this.selectedIndex = index;
          this.cardsChange.emit(this.cards);
        }
      }
    }
  }


  mouseEnter(event: MouseEvent, index: number){
    if(this.selectedIndex < 0){
      this.selectedIndex = index;
    }
  }

  mouseLeave(event: MouseEvent, index: number){
    this.selectedIndex = -1;
  }

  mouseMove(event: MouseEvent, index: number){
    this.endScroll();
    console.log({event});

    // (event as any).parentElement.parentElement.parentElement.scrollLeft += 100
    this.selectedIndex = index;
    if(event.offsetX < 100 && index > 0){
      this.selectedIndex = index -1;
      setTimeout(() => {
        this.selectedIndex = index;
      },10)
    }
    console.log(event.offsetX,index)
  }

  scrollLeft(){
    this.endScroll();
    const container = document.getElementById('stacked-cards');
    if(container){
      this.interval = setInterval(() => {
        if(container.scrollLeft >= 30){
          container.scrollLeft -= 30;
        }
      },20)
  }
      
  }

  scrollRight(){
   this.endScroll();
    const container = document.getElementById('stacked-cards');
    if(container){
      this.interval = setInterval(() => {
        container.scrollLeft += 30;
      },20)
  }
}

  endScroll(){
    if(this.interval){
      clearInterval(this.interval)
    }
  }

  scrollIndexIntoView(index: number){
    if(this.stackedCards){
      console.log(this.stackedCards.get(index)?.nativeElement)
      this.stackedCards.get(index)?.nativeElement.scrollIntoView();
  }
}

} 


