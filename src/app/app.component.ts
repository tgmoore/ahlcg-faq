import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

import { AwsService } from './state/aws.service';
import { AhdbService } from './state/ahdb.service';

import { first, Observable, Subject, takeUntil } from 'rxjs';

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

  fetchCards() {
    this._ahdb.getCards().pipe(first()).subscribe({
      next: console.log
    });
  }

  fetchFAQs() {
    this.cards.pipe(takeUntil(this.abort)).subscribe();
  }

  viewStoredFAQS() {
    this.faqs = this._aws.getFAQs(this.searchControl.value);
  }

  writeFAQsFromLocal() {
    this._aws.writeFAQs();
  }

  stopFetch() {
    this.abort.next(null);
  }
}
