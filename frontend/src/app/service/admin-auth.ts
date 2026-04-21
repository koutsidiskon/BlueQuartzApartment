import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminUserSession {
  id: number;
  email: string;
  role: 'owner' | 'family';
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AdminAuthResponse {
  success: boolean;
  data?: AdminUserSession;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private apiUrl = '/api/admin/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AdminAuthResponse> {
    return this.http.post<AdminAuthResponse>(
      `${this.apiUrl}/login`,
      { email, password },
      { withCredentials: true }
    );
  }

  me(): Observable<AdminAuthResponse> {
    return this.http.get<AdminAuthResponse>(`${this.apiUrl}/me`, {
      withCredentials: true
    });
  }

  logout(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/logout`,
      {},
      { withCredentials: true }
    );
  }
}
