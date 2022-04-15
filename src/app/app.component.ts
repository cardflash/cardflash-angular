import { AfterViewInit, Component, HostListener, OnDestroy} from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { DataApiService } from './data-api.service';
import { AccountService } from './services/account.service';
import { UserNotifierService } from './services/notifier/user-notifier.service';
import { UtilsService } from './utils.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  currentLocale : 'en' | 'de' = 'en';
  constructor(public accountService: AccountService, public userNotifier : UserNotifierService, public utilService: UtilsService, public dataApi: DataApiService, private router: Router){
    this.dataApi.fetchConfig()
    this.accountService.updateAcc();
    if(window.location.href.includes('/de/')){
      this.currentLocale = 'de';
    }
  }


  ngOnDestroy(): void {
  }

  ngAfterViewInit(): void {

  }

  @HostListener('window:click', ['$event'])
  click(event: KeyboardEvent) {
    const path = event.composedPath() as Array<any>;
    const firstAnchor : HTMLAnchorElement | null = path.find(p => p && p.tagName && p.tagName.toLowerCase() === 'a');
    if (firstAnchor && !firstAnchor.hasAttribute('routerlink')) {
      console.log({firstAnchor})
      const href = firstAnchor.getAttribute('href');
      if(href?.indexOf(environment.BASE_URL) === 0 ){
        event.preventDefault();
        if(href.indexOf('/edit') < 0){

          this.router.routeReuseStrategy.shouldReuseRoute  = () => false;
          console.log('internal link pressed',href)
          // this.router.onSameUrlNavigation = 'reload';
          // this.router.routeReuseStrategy.shouldReuseRoute = function (e) {
            //   for (let i = 0; i < e.children.length; i++) {
        //     const c1 = e.children[i];
        //     for (let j = 0; j < c1.children.length; j++) {
          //       const c2 = c1.children[j];
        //       if(c1.paramMap.keys.length + c2.paramMap.keys.length > 0){
          //         return false;
          //       }
          //     }
          //   }
          //   console.log({e})
        //   return true;
        // };
        this.router.navigateByUrl(href.replace(environment.BASE_URL,''),);
        // this.router.routeReuseStrategy.shouldReuseRoute  = () => true;
      }
      }
    }
  }


  async logout(){
    await this.accountService.logout();
  }
  getFlagImgURL(locale: string){
    // return this.dataService.getFlagURL(locale).href;
    return ''
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