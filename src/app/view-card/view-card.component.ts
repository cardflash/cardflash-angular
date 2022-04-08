import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { CardEntry, CardEntryContent, DataApiService, DocumentEntry } from '../data-api.service';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-view-card',
  templateUrl: './view-card.component.html',
  styleUrls: ['./view-card.component.scss']
})
export class ViewCardComponent implements OnInit {


  public card:  CardEntry | CardEntryContent | undefined;

  private id?: string;

  public currPageNumber: number = 0;

  public document: DocumentEntry | undefined;
  public pdfSrc? : SafeUrl;
  public requestFailed: boolean = false;
  constructor(private actRoute: ActivatedRoute,public router: Router, public dataApi: DataApiService, public utils: UtilsService, private domSanitizer: DomSanitizer, titleService:Title) {
    this.id = actRoute.snapshot.params.id
    titleService.setTitle('cardflash.net - View Card ' + this.id)
  }

  ngOnInit(): void {
    if(this.id){
      this.dataApi.getCard(this.id).then((card) => {
        this.card = card;
        this.dataApi.listDocumentsForCard(card.$id).then(async (docs) => {
          console.log('list result',{docs})
          if(docs.length > 0){
            this.document = docs[0];
            this.pdfSrc = this.domSanitizer.bypassSecurityTrustResourceUrl((await this.dataApi.getFileView(this.document?.fileid)).href + `#page=${card.page}`);

            this.currPageNumber = card.page;
            console.log(this.pdfSrc)
          }
        })
      }).catch((reason) => {
        this.requestFailed = true;
      })
    }
  }

  printCard(){
    window.print()
  }
}
