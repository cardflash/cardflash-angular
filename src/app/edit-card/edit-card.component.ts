import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CardEntry, CardEntryContent, DocumentEntry, DataApiService } from '../data-api.service';

@Component({
  selector: 'app-edit-card',
  templateUrl: './edit-card.component.html',
  styleUrls: ['./edit-card.component.scss']
})
export class EditCardComponent implements OnInit {

  public card:  CardEntry | CardEntryContent | undefined;

  private id?: string;

  public document: DocumentEntry | undefined;
  public requestFailed: boolean = false;
  constructor(private actRoute: ActivatedRoute,public router: Router, public dataApi: DataApiService) {
    this.id = actRoute.snapshot.params.id
  }

  ngOnInit(): void {
    if(this.id){
      this.dataApi.getCard(this.id).then((card) => {
        this.card = card;
        this.dataApi.listDocumentsForCard(card.$id).then((docs) => {
          console.log('list result',{docs})
          if(docs.length > 0){
            this.document = docs[0];
          }
        })
      }).catch((reason) => {
        this.requestFailed = true;
      })
    }
    // this.subscription = this.cardService.cards$.subscribe((cards)=> {if(cards !== undefined) this.refresh(cards)})
    // this.documentSubscription = this.documentService.documents$.subscribe((docs) => {if(docs !== undefined) this.refreshDocuments(docs)});

  } 

  ngOnDestroy(){
  }



  async deleteCard(){
    if(this.card?.$id){
      await this.dataApi.deleteCard(this.card.$id)
      this.router.navigateByUrl('cards')
    }
  }

}
