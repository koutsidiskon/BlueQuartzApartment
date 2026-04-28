import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type BookingSource = 'Website' | 'Booking' | 'Airbnb' | 'Email' | 'WhatsApp' | 'Other';

export interface BookingListItem {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestPhoneCountryCode: string | null;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  notes: string | null;
  source: BookingSource;
  inquiryId: number | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingCalendarItem {
  id: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  source: BookingSource;
  color: string;
}

export interface CreateBookingData {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestPhoneCountryCode?: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  notes?: string;
  source: BookingSource;
  inquiryId?: number;
  force?: boolean;
}

export interface BookingPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface BookingListResponse {
  success: boolean;
  data: BookingListItem[];
  pagination: BookingPagination;
}

export interface BookingCalendarResponse {
  success: boolean;
  data: BookingCalendarItem[];
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private apiUrl = '/api/bookings';

  constructor(private http: HttpClient) {}

  getBookings(page: number, pageSize: number, search?: string, sortField?: string, sortDir?: string): Observable<BookingListResponse> {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (search) params['search'] = search;
    if (sortField) params['sortField'] = sortField;
    if (sortDir) params['sortDir'] = sortDir;
    return this.http.get<BookingListResponse>(this.apiUrl, { withCredentials: true, params });
  }

  getBookingsForCalendar(): Observable<BookingCalendarResponse> {
    return this.http.get<BookingCalendarResponse>(`${this.apiUrl}/calendar`, { withCredentials: true });
  }

  createBooking(data: CreateBookingData): Observable<any> {
    return this.http.post(this.apiUrl, data, { withCredentials: true });
  }

  createFromInquiry(inquiryId: number, data: { guestPhone?: string; guestPhoneCountryCode?: string; notes?: string; force?: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/from-inquiry/${inquiryId}`, data, { withCredentials: true });
  }

  updateBooking(id: number, data: Partial<CreateBookingData>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, { withCredentials: true });
  }

  deleteBooking(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  getIcalUrl(): Observable<{ success: boolean; url: string }> {
    return this.http.get<{ success: boolean; url: string }>(`${this.apiUrl}/ical-url`, { withCredentials: true });
  }
}
