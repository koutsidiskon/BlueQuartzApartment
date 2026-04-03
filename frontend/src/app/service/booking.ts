import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Booking {
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = 'http://localhost:3000/api/bookings';

  constructor(private http: HttpClient) { }

  getOccupiedDates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/occupied`);
  }

  createBooking(booking: Booking): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, booking);
  }
}