import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  standalone:false,
})
export class AdminLayoutComponent implements OnInit {

  currentDate;
  public showCollapse = false;

  constructor() { }

  ngOnInit(): void {
    let links = document.querySelectorAll('.dropdown-toggle'); 
    
    [...Array.from(links)].forEach(item => {

      item.addEventListener("mouseenter", (e) => {

        [...Array.from(links)].forEach(link=>{
          let dropdown = link.closest('.dropdown');
          if (dropdown.classList.contains('open')) dropdown.classList.remove('open');
        })

        let target = e.target as HTMLElement;
        let dropdown = target.closest('.dropdown');
        if (!dropdown.classList.contains('open')) dropdown.classList.add('open');

      });

      item.addEventListener("mouseleave", (e) => {
        let target = e.target as HTMLElement;
        let dropdown = target.closest('.dropdown');
        setTimeout(() => {
          if (dropdown.classList.contains('open')) dropdown.classList.remove('open');
        }, 1000);
      });

    });

    let menu = document.querySelectorAll('.dropdown-menu, .dropdown-submenu');
    [...Array.from(menu)].forEach(item => {
      item.addEventListener("mouseenter", (e) => {
        let target = e.target as HTMLElement;
        let dropdown = target.closest('.dropdown');
        if (!dropdown.classList.contains('open')) dropdown.classList.add('open');
      });
      item.addEventListener("mouseleave", (e) => {
        let target = e.target as HTMLElement;
        let dropdown = target.closest('.dropdown');
        setTimeout(() => {
          if (dropdown.classList.contains('open')) dropdown.classList.remove('open');
        }, 1000);
      });
    });

    this.currentDate = new Date().toLocaleTimeString();

  }

}
