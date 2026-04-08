import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InquiryData {
  fullName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  message?: string;
  botField?: string;
  recaptchaToken?: string;
}

@Injectable({ providedIn: 'root' })

export class InquiryService {
  private apiUrl = 'http://localhost:3000/api/inquiries'; 

  constructor(private http: HttpClient) {}

  // Sends the inquiry data to the backend API to create a new inquiry record
  createInquiry(data: InquiryData): Observable<any> {
    // console.log(" Sending inquiry data to backend:", data);
    return this.http.post(this.apiUrl, data);
  }
  
  
}
