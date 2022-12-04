import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { FAQ } from './ahdb.types';

import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AhdbService {
  private readonly _baseUrl = 'https://arkhamdb.com/api/public';

  constructor(private _http: HttpClient) { }

  getFAQ(cardCode: string) {
    return this._http.get<FAQ[]>(`${this._baseUrl}/faq/${cardCode}.json`);
  }
}
