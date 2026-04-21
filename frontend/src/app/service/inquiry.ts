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

export interface InquiryListItem {
  id: number;
  fullName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface InquiryListResponse {
  success: boolean;
  data: InquiryListItem[];
  pagination: InquiryPagination;
}

@Injectable({ providedIn: 'root' })

export class InquiryService {
  private apiUrl = '/api/inquiries';

  constructor(private http: HttpClient) {}

  // Sends the inquiry data to the backend API to create a new inquiry record
  createInquiry(data: InquiryData): Observable<any> {
    // console.log(" Sending inquiry data to backend:", data);
    return this.http.post(this.apiUrl, data);
  }

  getInquiries(page: number, pageSize: number): Observable<InquiryListResponse> {
    return this.http.get<InquiryListResponse>(this.apiUrl, {
      withCredentials: true,
      params: {
        page: String(page),
        pageSize: String(pageSize)
      }
    });
  }
  
  
}
