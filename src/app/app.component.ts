import { Component} from '@angular/core';
import { DataService } from './data.service';
import { AccountService } from './services/account.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(public accountService: AccountService, public dataService: DataService){
    this.accountService.updateAcc();
  }
}