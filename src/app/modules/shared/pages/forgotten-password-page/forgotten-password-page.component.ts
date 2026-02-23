import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-forgotten-password-page',
  templateUrl: './forgotten-password-page.component.html',
  styleUrls: ['./forgotten-password-page.component.scss'],
  host: {
    "[style.backgroundColor]":"'#ddd'",
    "[style.height]": "'100%'",
    "[style.paddingTop]": "'40px'"
  },
  standalone:false,
})
export class ForgottenPasswordPageComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
