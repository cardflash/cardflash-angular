import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountService } from 'src/app/services/account.service';
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
  constructor(private formBuilder : FormBuilder, public accountService: AccountService) {
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

  ngOnInit(): void {

  }

  async login(){
  if(this.loginForm.valid){
      const success =  await this.accountService.login(this.loginForm.get('email')?.value, this.loginForm.get('password')?.value);
      if(success){
        this.loginForm.get('password')?.setValue("");
        this.loginForm.get('repeatPassword')?.setValue("");
      }
    }
  }

  async register(){
    if(this.registerForm.valid && this.registerForm.get('password')?.value === this.registerForm.get('repeatPassword')?.value){
      const success =  await this.accountService.register(this.registerForm.get('email')?.value, this.registerForm.get('password')?.value);
      if(success){
        this.registerForm.get('password')?.setValue("");
        this.registerForm.get('repeatPassword')?.setValue("");
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
}
