import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InquiryData {
  fullName: string;
  email: string;
  phoneCountryCode?: string;
  phone?: string;
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
  phoneCountryCode: string | null;
  phone: string | null;
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

export interface DeleteInquiriesResponse {
  success: boolean;
  message: string;
  data: { deletedCount: number };
}

@Injectable({ providedIn: 'root' })
export class InquiryService {
  private apiUrl = '/api/inquiries';

  constructor(private http: HttpClient) {}

  createInquiry(data: InquiryData): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getInquiries(page: number, pageSize: number, search?: string, sortField?: string, sortDir?: string): Observable<InquiryListResponse> {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize)
    };
    if (search) params['search'] = search;
    if (sortField) params['sortField'] = sortField;
    if (sortDir) params['sortDir'] = sortDir;

    return this.http.get<InquiryListResponse>(this.apiUrl, {
      withCredentials: true,
      params
    });
  }

  deleteInquiries(ids: number[]): Observable<DeleteInquiriesResponse> {
    return this.http.delete<DeleteInquiriesResponse>(this.apiUrl, {
      withCredentials: true,
      body: { ids }
    });
  }
}
