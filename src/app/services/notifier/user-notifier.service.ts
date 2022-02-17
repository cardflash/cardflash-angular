import { Injectable, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, NavigationStart, Router, RoutesRecognized } from '@angular/router';
import { NotificationData } from 'src/app/types/notification-data';
import { NotificationComponent } from './notification/notification.component';

@Injectable({
  providedIn: 'root'
})
export class UserNotifierService implements OnDestroy{

  private readonly POSITION :  "top" | "bottom" | "middle" = "middle";
  public loadStatus = 0;

  constructor(private snackBar: MatSnackBar, private router: Router) {

  //   this.routerSubscription = this.router.events.subscribe(event => {
  //     console.log('current route: ', this.router.url.toString(),{event},(event instanceof NavigationEnd));
  //     // if(event instanceof NavigationEnd){
  //     //   setTimeout(() => this.loadStatus = 100,100)
  //     // }
  //     if(event instanceof NavigationStart){
  //       this.loadStatus = 10;
  //     }
  // });

   }
  ngOnDestroy(): void {
  }

  async notify(title: string, message: string, type: string, autoHide: boolean = false){
    const notificationData : NotificationData =
    {title: title, message: message,
      type: type === "danger" ? "danger" : "success",
      autoHide: autoHide};

    const snackRef = this.snackBar.openFromComponent(NotificationComponent,{
      verticalPosition: 'top',
      panelClass: type,
      data: notificationData,
      duration: autoHide ? 2000 : undefined
    })
    // snackRef.afterDismissed
    // const toastNot = await this.toastController.create({
    //   header: title,
    //   message: message,
    //   position: this.POSITION,
    //   color: color,
    //   duration: autoHide ? 2000 : undefined,
    //   buttons: [{text: " Ok", icon: "checkmark-outline", role: "cancel", handler: () => {}}],
    //   mode: 'ios'
    // });
    // toastNot.present();
  }


  async notifyForPromise(promise : Promise<unknown>, name: string, additionalSuccessText = '', additionalErrorText = '') : Promise<{success: boolean, result : any}>{
    return new Promise((resolve) => {
      promise.then((res) => {
        this.notify(name + " was successfull.",additionalSuccessText,"success", true);
        resolve({success: true,result:res});
      },
      (err) => {
        console.log(name + " failed ",err)
        this.notify(name + " failed.",additionalErrorText + "\n" + err.message ,"danger");
        resolve({success: false, result:err});
      })
    })
  }

  async notifyOnPromiseReject(promise : Promise<unknown>, name: string, additionalErrorText = "") : Promise<{success: boolean, result : any}>{
    return new Promise((resolve) => {
      promise.then((res) => {
        console.log("Silent Success:", name + " was successfull.", res);
        resolve({success: true,result:res});
      },
      (err) => {
        console.log(name + " failed ",err)
        this.notify(name + " failed.",additionalErrorText + "\n" + err.message ,"danger",false,);
        resolve({success: false, result:err});
      })
    })
  }

  async notifyOnRejectOrError(promise : Promise<unknown>, name: string, additionalErrorText = "", isError: (result: any) => boolean) : Promise<{success: boolean, result : any}>{
    return new Promise((resolve) => {
      promise.then((res) => {
        if(!isError({success: true,result:res})){
          console.log("Silent Success:", name + " was successfull.", res);
          resolve({success: true,result:res});
        }else{
          console.log(name + " failed ",res)
          this.notify(name + " failed.",additionalErrorText + "\n" + res ,"danger",false,);
          resolve({success: false, result:res});
        }
      },
      (err) => {
        if(!isError({success: false,result:err})){
          console.log("Silent Success:", name + " Request failed but was deemed successfull.", err);
          resolve({success: true,result:err});
        }else{
          console.log(name + " failed ",err)
          this.notify(name + " failed.",additionalErrorText + "\n" + err ,"danger",false,);
          resolve({success: false, result:err});
        }
      })
    })
  }

  notifyForPromiseFlag(promise : Promise<unknown>, name: string, notifyForSuccess : boolean) : Promise<{success: boolean, result : any}>{
    if(notifyForSuccess){
      return this.notifyForPromise(promise,name,"");
    }else{
      return this.notifyOnPromiseReject(promise,name);
    }

  }
}
