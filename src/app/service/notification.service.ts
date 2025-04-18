import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8080/EMS';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  sendNotification(userId: number, eventId: number, message: string): Observable<any> {
    return this.http.post(`${API_URL}/Notification/send`, null, {
      params: {
        userId: userId.toString(),
        eventId: eventId.toString(),
        message: message
      },
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      responseType: 'text'
    });
  }

  getUserNotifications(userId: number): Observable<any> {
    return this.http.get(`${API_URL}/Notification/all`, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      }
    });
  }

  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${API_URL}/Notification/delete/${notificationId}`, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      responseType: 'text'
    });
  }
}