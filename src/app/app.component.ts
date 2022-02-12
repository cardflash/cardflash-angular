import { AfterViewInit, Component, OnDestroy} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DataService } from './data.service';
import { DocumentService } from './document.service';
import { AccountService } from './services/account.service';
import { UserNotifierService } from './services/notifier/user-notifier.service';
import { UtilsService } from './utils.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  anchorSubscription: Subscription | undefined;
  currentLocale : 'en' | 'de' = 'en';
  constructor(public accountService: AccountService, public dataService: DataService, private route: ActivatedRoute, private router: Router, private documentService: DocumentService, public userNotifier : UserNotifierService, public utilService: UtilsService){
    this.accountService.updateAcc();
    if(window.location.href.includes('/de/')){
      this.currentLocale = 'de';
    }
  }
  ngOnDestroy(): void {
      if(this.anchorSubscription){
        this.anchorSubscription.unsubscribe();
    }
  }

  ngAfterViewInit(): void {

    // this.anchorSubscription = this.route.fragment.subscribe(fragment => {
    //   if(fragment){
    //     console.log('fragment',fragment)
    //     this.utilService.createLineBetweenIds(environment.ANNOTATION_ON_CARD_PREFIX+fragment,environment.ANNOTATION_JMP_PREFIX+fragment)
    //     if(document.querySelector('#'+fragment)){
    //       document.querySelector('#'+fragment)?.scrollIntoView({behavior: 'smooth'});
    //       this.router.navigate([],{fragment: undefined})
        
    //     }else{
    //       setTimeout(() => {
    //         if(document.querySelector('#'+fragment)){
    //           document.querySelector('#'+fragment)?.scrollIntoView({behavior: 'smooth'});
    //           this.router.navigate([],{fragment: undefined})
    //         }
    //       },6000)
    //     }
    //   }
    // } 
    //   );
  }


  async logout(){
    await this.accountService.logout();
  }
  getFlagImgURL(locale: string){
    return this.dataService.getFlagURL(locale).href;
  }

  changeLocale(locale: 'de' | 'en'){
    console.log("LOCALE CHANGE",locale);
    if(this.currentLocale === locale){
      return;
    }
    window.addEventListener('beforeunload', function(e){
      e.preventDefault();
      e.returnValue = '';
    })
    let url;
    if(this.currentLocale === 'de'){
      url = window.location.href.replace('/de/',"/"+locale+"/");
    }else{
      url = window.location.href.replace('/en/',"/"+locale+"/")
    }
    console.log("LOCALE CHANGE URL",url);
    window.location.assign(url);
  }
}