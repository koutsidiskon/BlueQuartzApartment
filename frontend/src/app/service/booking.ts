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
  totalAmount: number;
  commissionAmount: number;
  environmentalTaxAmount: number;
  bankTransferAmount: number;
  bankFeeAmount: number;
  cashDepositAmount: number;
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

export interface BookingFinancialSummary {
  totalAmount: number;
  commissionAmount: number;
  environmentalTaxAmount: number;
  bankTransferAmount: number;
  netProfit: number;
  bankFeeAmount: number;
  cashDepositAmount: number;
  cashRemainingAmount: number;
  cashRevenue: number;
  bookingRevenue: number;
  bookingNetProfit: number;
  bookingFees: number;
  totalProfit: number;
  turnover: number;
  netWorth: number;
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
  totalAmount?: number;
  commissionAmount?: number;
  environmentalTaxAmount?: number;
  bankTransferAmount?: number;
  bankFeeAmount?: number;
  cashDepositAmount?: number;
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
  financialSummary: BookingFinancialSummary;
}

export interface BookingYearStatistic {
  year: number;
  bookings: number;
  nights: number;
  turnover: number;
  cashRevenue: number;
  bookingNetProfit: number;
  bookingFees: number;
  environmentalFees: number;
  totalProfit: number;
}

export interface BookingCalendarResponse {
  success: boolean;
  data: BookingCalendarItem[];
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private apiUrl = '/api/bookings';

  constructor(private http: HttpClient) {}

  getBookings(page: number, pageSize: number, search?: string, sortField?: string, sortDir?: string, year?: number | null): Observable<BookingListResponse> {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (search) params['search'] = search;
    if (sortField) params['sortField'] = sortField;
    if (sortDir) params['sortDir'] = sortDir;
    if (year) params['year'] = String(year);
    return this.http.get<BookingListResponse>(this.apiUrl, { withCredentials: true, params });
  }

  getStatistics(): Observable<{ success: boolean; data: BookingYearStatistic[] }> {
    return this.http.get<{ success: boolean; data: BookingYearStatistic[] }>(`${this.apiUrl}/statistics`, { withCredentials: true });
  }

  getBookingsForCalendar(): Observable<BookingCalendarResponse> {
    return this.http.get<BookingCalendarResponse>(`${this.apiUrl}/calendar`, { withCredentials: true });
  }

  createBooking(data: CreateBookingData): Observable<any> {
    return this.http.post(this.apiUrl, data, { withCredentials: true });
  }

  createFromInquiry(inquiryId: number, data: { guestPhone?: string; guestPhoneCountryCode?: string; notes?: string; totalAmount?: number; commissionAmount?: number; environmentalTaxAmount?: number; bankTransferAmount?: number; bankFeeAmount?: number; cashDepositAmount?: number; force?: boolean }): Observable<any> {
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
