import { AfterViewInit, Component, EventEmitter, HostListener, Inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FlipCardComponent } from '../card/flip-card/flip-card.component';
import { CardEntry } from '../data-api.service';

@Component({
  selector: 'app-study-card-ui',
  templateUrl: './study-card-ui.component.html',
  styleUrls: ['./study-card-ui.component.scss'],
})
export class StudyCardUiComponent implements OnInit, AfterViewInit {
  public card: CardEntry = {
    front: '',
    back: '',
    page: 0,
    hiddenText: '',
    chapter: '',
    title: '',
    creationTime: Date.now(),
    $id: 'does-not-exist',
    $collection: 'none',
    $read: [],
    $write: [],
  };

  @Input('cards')
  set setCards(cards: CardEntry[]){
    console.log({cards},'cards set')
    this.cards = cards;
    if(cards.length > 0){
      this.card = cards[0]
    }
  }

  public cards : CardEntry[] = [];
  // public cards: CardEntry[] = [];
  @Output('cardsChange')
  public cardsChange: EventEmitter<CardEntry[]> = new EventEmitter<CardEntry[]>();

  public lastCards: CardEntry[]  = [];

  public lastSelectedAnswer: 'hard' | 'good' | 'easy' | null = null;
  @ViewChild('flipCard')
  public flipCard?: FlipCardComponent;

  @ViewChild('answerButtonHard')
  public answerButtonHard?: MatButton;

  @ViewChild('answerButtonEasy')
  public answerButtonEasy?: MatButton;

  @ViewChild('answerButtonGood')
  public answerButtonGood?: MatButton;

  @ViewChild('showAnswerButton')
  public showAnswerButton?: MatButton;

  public flipped: boolean = false;

  constructor(public router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.selectRandomCard();
  }

  ngAfterViewInit(): void {
    // this.answerButton?.focus();
  }

  flip(toFlipped: boolean = !this.flipped, animate = true) {
    this.flipped = toFlipped;
    if(this.flipped){
      console.log(this.answerButtonGood)
      setTimeout(() => {
        this.answerButtonGood?.focus();
      },20)
    }
    if (this.flipCard) {
      this.flipCard.animate = animate;
      setTimeout(() => {
        if (this.flipCard) {
          this.flipCard.animate = true;
        }
      }, 1);
      this.flipCard.flipped = this.flipped;
    }
  }

  selectRandomCard() {
    if (this.cards.length > 0) {
      this.flip(false, false);
      const index = 0 //Math.floor(Math.random() * this.cards.length);
      this.card = this.cards[index];
      this.showAnswerButton?.focus();
    }
  }

  closeDialog(){
    this.dialog.closeAll();

  }

  editCard() {
    if (this.card) {
      this.router.navigate(['cards', this.card?.$id]);
      this.closeDialog();
    }
  }
  @HostListener('window:keyup.1', ['$event'])
  @HostListener('window:keyup.2', ['$event'])
  @HostListener('window:keyup.3', ['$event'])
  handleKeyPress(e: KeyboardEvent){
    if(this.flipped){
      switch (e.key) {
        case '1':
          this.finishCard('hard')
          break;
          case '2':
            this.finishCard('good')
            break;
            case '3':
              this.finishCard('easy')
              break;
            }
          }
  }

  finishCard(status: 'hard' | 'good' | 'easy') {
    this.lastSelectedAnswer = status;
    // switch (status) {
    //   case 'hard':
    //     this.answerButtonHard?.focus()
    //     break;
    //   case 'good':
    //     this.answerButtonGood?.focus()
    //   break;
    //   case 'easy':
    //     this.answerButtonEasy?.focus()
    //   break;
    // }

    this.cards = this.cards.filter((c) => c.$id !== this.card.$id);
    if (status === 'hard') {
      this.cards.push(this.card);
    }
    this.cardsChange.emit(this.cards);
    this.lastCards.push(this.card);
    this.selectRandomCard();
    setTimeout(() => {
      this.lastSelectedAnswer = null;
    }, 300);
  }

  undoLastCard() {
    this.cards = this.cards.filter((c) => c.$id !== this.card.$id);
    this.cards.push(this.card);
    if (this.lastCards.length >= 1) {
      const card = this.lastCards.pop();
      if(card !== undefined){
        this.card = card;
      }
    }
    this.cardsChange.emit(this.cards);
  }


  getProgressValue(){
    if((this.cards.length + this.lastCards.length) > 0){
      return 100*(this.lastCards.length/(this.lastCards.length + this.cards.length));
    }else{
      return 0;
    }
  }
}
