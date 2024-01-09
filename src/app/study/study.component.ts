import { Component, OnInit } from '@angular/core';
import { CardEntry, DataApiService } from '../data-api.service';

@Component({
  selector: 'app-study',
  templateUrl: './study.component.html',
  styleUrls: ['./study.component.scss']
})
export class StudyComponent implements OnInit {

  public cards: CardEntry[] = []
  constructor(private dataApi: DataApiService) {
  }
  
  async ngOnInit() {
    this.cards = await this.dataApi.listCards(true,100)
  }

  public cardChange(cards: CardEntry[]){
    console.log("Card change")
    this.cards = [...cards];
  }

}
