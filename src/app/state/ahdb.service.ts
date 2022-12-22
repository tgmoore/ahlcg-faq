import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { FAQ } from './ahdb.types';

@Injectable({
  providedIn: 'root'
})
export class AhdbService {
  private readonly _baseUrl = 'https://arkhamdb.com/api/public';

  constructor(private _http: HttpClient) { }

  getCard(cardCode: string) {
    return this._http.get(`${this._baseUrl}/card/${cardCode}.json`);
  }

  getCards() {
    return this._http.get(`${this._baseUrl}/cards/`);
  }

  getFAQ(cardCode: string) {
    return this._http.get<FAQ[]>(`${this._baseUrl}/faq/${cardCode}.json`);
  }
}
