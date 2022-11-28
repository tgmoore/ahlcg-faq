import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { AttributeValue } from '@aws-sdk/client-dynamodb';

import { AwsService } from './state/aws.service';

import { tap, Observable, map, switchMap, filter } from 'rxjs';
import { AhdbService } from './state/ahdb.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  cards = new Observable<any>();
  JSON = JSON;
  title = 'ahlcg-faq';

  constructor(private _aws: AwsService, private _ahdb: AhdbService) { }

  ngOnInit(): void {
    this.cards = this._aws.readItems().pipe(
      map(x => x[1]['code']['S'] || ''),
      filter(x => !!x),
      switchMap(x => this._ahdb.getFAQ(x)),
      map(x => x[0]['text'])
      );
  }
}
