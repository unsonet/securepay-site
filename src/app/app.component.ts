import { Component, Inject, Optional } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, map } from 'rxjs/operators';
import { PROMO_MODE } from './tokens';

@Component({
    selector: 'app-root',//?add app-new-promotion-page //?remove app-root
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false,
})
export class AppComponent {
    constructor(
        private router: Router, 
        private activatedRoute: ActivatedRoute, 
        private titleService: Title,
        @Optional() @Inject(PROMO_MODE) public isPromo: boolean
    ) {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(() => {
                let child = this.activatedRoute.firstChild;
                while (child) {
                    if (child.firstChild) {
                        child = child.firstChild;
                    } else if (child.snapshot.data && child.snapshot.data['title']) {
                        return child.snapshot.data['title'];
                    } else {
                        return null;
                    }
                }
                return null;
            })
        ).subscribe((data: any) => {
            if (data) {
                this.titleService.setTitle('SecurePay : ' + data);
            }
        });
    }
}
