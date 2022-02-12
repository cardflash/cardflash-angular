import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from 'src/app/document.service';
import { AccountService } from 'src/app/services/account.service';
import { UserNotifierService } from 'src/app/services/notifier/user-notifier.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public loginForm : FormGroup;
  public registerForm : FormGroup;
  public email : string = "";

  public isVerifying : boolean = false;
  public startEmailVerificationDisabled = false;

  public verifySecret: string = '';
  public verifyUserid: string = '';

  constructor(private formBuilder : FormBuilder, public accountService: AccountService,private route: ActivatedRoute, private router: Router, private documentService: DocumentService, private userNotifierService: UserNotifierService) {
    this.loginForm = formBuilder.group({
      email: ['',[Validators.required,Validators.email]],
      password: ['',[Validators.required,Validators.minLength(environment.MIN_PW_LENGTH),Validators.maxLength(environment.MAX_PW_LENGTH)]]
    });
    this.registerForm = formBuilder.group({
      email : ['', [Validators.required,Validators.email]],
      password : ['', [Validators.required,Validators.minLength(environment.MIN_PW_LENGTH),Validators.maxLength(environment.MAX_PW_LENGTH)]],
      repeatPassword : ['', [Validators.required]],
    });
  }

  async ngOnInit() {
    let queryParamMap = this.route.snapshot.queryParamMap;
    if(queryParamMap.has('verification')){
      if(queryParamMap.get('verification') == '1'){
        this.isVerifying = true;
        this.verifySecret = queryParamMap.get('secret') || "";
        this.verifyUserid = queryParamMap.get('userId') || "";
        console.log("verify email", this.verifyUserid ,  this.verifySecret )
      }

      this.router.navigate([],{queryParams: {'secret': null, userId: null, verification: null}, queryParamsHandling: 'merge'});
    }
    await this.accountService.updateAcc();
    console.log(this.accountService.getAcc())
  }

  async login(){
  if(this.loginForm.valid){
      const success =  await this.accountService.login(this.loginForm.get('email')?.value, this.loginForm.get('password')?.value);
      if(success){
        this.loginForm.get('password')?.setValue("");
        this.loginForm.get('repeatPassword')?.setValue("");
        this.userNotifierService.notify("Login successfull!","","success",true);
        await this.documentService.refresh();
        this.router.navigate(['/documents']);
      }
    }
  }

  async register(){
    if(this.registerForm.valid && this.registerForm.get('password')?.value === this.registerForm.get('repeatPassword')?.value){
      const success =  await this.accountService.register(this.registerForm.get('email')?.value, this.registerForm.get('password')?.value);
      if(success){
        this.registerForm.get('password')?.setValue("");
        this.registerForm.get('repeatPassword')?.setValue("");
        this.userNotifierService.notify("Registration successfull!","","success",true);
        await this.documentService.refresh();
        this.router.navigate(['/documents']);
      }
    }
  }

  getPWMinLength(){
    return environment.MIN_PW_LENGTH;
  }

  getPWMaxLength(){
    return environment.MAX_PW_LENGTH;
  }

  loginWithGoogle(){
    this.accountService.loginWithGoogle();
  }


  canStartValidation(){
    return (this.accountService.isLoggedIn() && !this.accountService.getAcc().emailVerification) && !this.isVerifying;
  }

  canValidateEmail(){
    return (!this.accountService.getAcc()?.emailVerification) && this.isVerifying;
  }



  async startVerification(){
    const success = await  this.accountService.startEmailVerification();
    if(success){
      this.startEmailVerificationDisabled = true;
      setTimeout(() => this.startEmailVerificationDisabled = true,30000);
    }
    }


    async verifyEmail(){
      const success = await this.accountService.verifyEmail(this.verifyUserid,this.verifySecret);
      if(success){
        this.router.navigate(['settings']);
      }
    }
}
