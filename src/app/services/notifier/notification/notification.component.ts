import { Component, Inject, OnInit } from '@angular/core';
import { MatSnackBar, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { NotificationData } from 'src/app/types/notification-data';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {

  constructor(@Inject(MAT_SNACK_BAR_DATA) public notificationData: NotificationData, private snackBar : MatSnackBar) {
    console.log(notificationData);
  }

  ngOnInit(): void {
  }

  dismiss(){
    this.snackBar.dismiss();
  }

}
