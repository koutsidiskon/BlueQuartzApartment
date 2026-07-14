import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface BlockedDatesResponse {
  success: boolean;
  data: string[];
  checkInDates?: string[];
  minimumStayDates?: MinimumStayDateItem[];
  message?: string;
}

export interface MinimumStayDateItem {
  date: string;
  minStayNights: number;
}

export interface MinimumStayDatesResponse {
  success: boolean;
  data: MinimumStayDateItem[];
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityCalendarService {
  private apiUrl = '/api/calendar/blocked-dates';

  private blockedDatesSubject = new BehaviorSubject<string[] | null>(null);
  readonly blockedDates$ = this.blockedDatesSubject.asObservable();

  private checkInDatesSubject = new BehaviorSubject<string[] | null>(null);
  readonly checkInDates$ = this.checkInDatesSubject.asObservable();

  constructor(private http: HttpClient) {}

  getBlockedDates(): Observable<BlockedDatesResponse> {
    return this.http.get<BlockedDatesResponse>(this.apiUrl).pipe(
      tap(response => {
        if (response?.success) {
          this.blockedDatesSubject.next(Array.isArray(response.data) ? response.data : []);
          this.checkInDatesSubject.next(Array.isArray(response.checkInDates) ? response.checkInDates : []);
        }
      })
    );
  }

  updateBlockedDates(dates: string[], blocked: boolean): Observable<BlockedDatesResponse> {
    return this.http.put<BlockedDatesResponse>(
      this.apiUrl,
      { dates, blocked },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response?.success) {
          this.blockedDatesSubject.next(Array.isArray(response.data) ? response.data : []);
        }
      })
    );
  }

  updateMinimumStayDates(dates: string[], minStayNights: number): Observable<MinimumStayDatesResponse> {
    return this.http.put<MinimumStayDatesResponse>(
      `/api/calendar/minimum-stay-dates`,
      { dates, minStayNights },
      { withCredentials: true }
    );
  }
}
