import { Component, OnInit } from '@angular/core';
import { AwsService } from './state/aws.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ahlcg-faq';

  constructor(private _aws: AwsService) { }

  ngOnInit(): void {
    this._aws.readItems();
  }
}
