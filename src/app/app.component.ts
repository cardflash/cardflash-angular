import { AfterViewInit, Component, OnDestroy} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CardService } from './card/card.service';
import { DataService } from './data.service';
import { DocumentService } from './document.service';
import { AccountService } from './services/account.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  anchorSubscription: Subscription | undefined;
  
  constructor(public accountService: AccountService, public dataService: DataService, public cardService: CardService, private route: ActivatedRoute, private router: Router, private documentService: DocumentService){
    this.accountService.updateAcc();
    this.dataService.init();
    this.cardService.refresh();
    this.documentService.refresh();
  }
  ngOnDestroy(): void {
      if(this.anchorSubscription){
        this.anchorSubscription.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    this.anchorSubscription = this.route.fragment.subscribe(fragment => {
      if(fragment){
        console.log(fragment)
        document.querySelector('#'+fragment)?.scrollIntoView();
        this.router.navigate([],{fragment: undefined})
      }
    } 
      );
  }
}