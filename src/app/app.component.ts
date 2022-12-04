import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

import { AwsService } from './state/aws.service';
import { AhdbService } from './state/ahdb.service';

import { Observable, Subject, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  abort = new Subject<null>();
  cards = new Observable<any>();
  faqs = new Observable<any>();
  JSON = JSON;
  searchControl = new FormControl();
  startCode = '';
  title = 'ahlcg-faq';

  constructor(private _aws: AwsService, private _ahdb: AhdbService) { }

  ngOnInit(): void {
    this.cards = this._aws.persistFAQs(this.startCode);
  }

  fetchFAQs() {
    this.cards.pipe(takeUntil(this.abort)).subscribe();
  }

  viewStoredFAQS() {
    this.faqs = this._aws.getFAQs(this.searchControl.value).pipe(tap(console.log));
  }

  stopFetch() {
    this.abort.next(null);
  }
}
