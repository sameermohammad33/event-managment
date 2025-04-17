import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8080/EMS';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  createEvent(eventData: {
    name: string;
    category: string;
    location: string;
    date: string;
    organizer: { userId: number };
    availableTickets: number;
  }): Observable<any> {
    return this.http.post(`${API_URL}/Event/create`, eventData, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      responseType: 'text'
    });
  }

  updateEvent(eventId: number, eventData: {
    name: string;
    category: string;
    location: string;
    date: string;
    availableTickets: number;
  }): Observable<any> {
    return this.http.patch(`${API_URL}/Event/update/${eventId}`, eventData, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      responseType: 'text'
    });
  }

  deleteEvent(eventId: number): Observable<any> {
    return this.http.delete(`${API_URL}/Event/delete/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      responseType: 'text'
    });
  }
 
  getAllEvents(): Observable<any> {
    return this.http.get(`${API_URL}/Event/viewAll`, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      }
    });
  }

  getEventById(eventId: number): Observable<any> {
    return this.http.get(`${API_URL}/Event/byId/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      }
    });
  }
}