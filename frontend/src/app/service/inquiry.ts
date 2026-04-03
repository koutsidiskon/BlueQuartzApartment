import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InquiryData {
  fullName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })

export class InquiryService {
  private apiUrl = 'http://localhost:3000/api/inquiries'; 

  constructor(private http: HttpClient) {}

  createInquiry(data: InquiryData): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
}
