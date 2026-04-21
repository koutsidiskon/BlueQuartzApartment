import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface BlockedDatesResponse {
  success: boolean;
  data: string[];
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityCalendarService {
  private apiUrl = '/api/calendar/blocked-dates';

  private blockedDatesSubject = new BehaviorSubject<string[] | null>(null);
  readonly blockedDates$ = this.blockedDatesSubject.asObservable();

  constructor(private http: HttpClient) {}

  getBlockedDates(): Observable<BlockedDatesResponse> {
    return this.http.get<BlockedDatesResponse>(this.apiUrl).pipe(
      tap(response => {
        if (response?.success) {
          this.blockedDatesSubject.next(Array.isArray(response.data) ? response.data : []);
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
}
