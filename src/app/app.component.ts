import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { AttributeValue } from '@aws-sdk/client-dynamodb';

import { AwsService } from './state/aws.service';

import { tap, Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  cards = new Observable<Record<string, AttributeValue>[]>();
  JSON = JSON;
  title = 'ahlcg-faq';

  constructor(private _aws: AwsService) { }

  ngOnInit(): void {
    this.cards = this._aws.readItems().pipe(tap(console.log));
  }
}
