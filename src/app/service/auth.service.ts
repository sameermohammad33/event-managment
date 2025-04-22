// src/app/service/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

const API_URL = 'http://localhost:8080/EMS';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  login(credentials: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${API_URL}/Auth/login`, credentials, { responseType: 'text' }).pipe(
      tap((response: string) => {
        const [token, role, userId] = response.split(' ');
        
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_role', role);
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_name', credentials.name);
        localStorage.setItem('user_email', credentials.email);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    // Clear all auth-related data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
  }

  register(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    contactNumber: string;
  }): Observable<any> {
    return this.http.post(`${API_URL}/User/register`, userData, {
      responseType: 'text'
    });
  }

  getUserDetails(userId: number): Observable<any> {
    return this.http.get(`${API_URL}/User/getUserById/${userId}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
  }
  
  updateUser(userId: number, userData: any): Observable<any> {
    return this.http.patch(`${API_URL}/User/updateUser/${userId}`, userData, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      },
      responseType: 'text'
    });
  }
  
  changePassword(userId: number, passwordData: {currentPassword: string, newPassword: string}): Observable<any> {
    return this.http.post(`${API_URL}/User/changePassword/${userId}`, passwordData, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
  }

}





