import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8080/EMS';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  bookTicket(ticketData: {
    bookingDate: string;
    status: string;
    event: { eventId: number };
    user: { userId: number };
  }): Observable<any> {
    return this.http.post(`${API_URL}/Ticket/book`, ticketData, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      responseType: 'text'
    });
  }
}