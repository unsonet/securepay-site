import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  host: {
    "[style.backgroundColor]":"'#ddd'",
    "[style.height]": "'100%'",
    "[style.paddingTop]": "'40px'"
  },
  standalone:false,
})
export class LoginPageComponent implements OnInit, OnDestroy {

  form;

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = new FormGroup({
      email: new FormControl(null, [
        Validators.required,
        Validators.email
      ]),
      password: new FormControl(null, [
        Validators.required,
        Validators.minLength(6)
      ])
    })

  }

  ngOnDestroy(){

  }

  submit(){
    console.log('submitted');
    this.router.navigate(['/admin']);
  }
}
