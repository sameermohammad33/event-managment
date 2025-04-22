import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';
import { catchError, Observable } from 'rxjs';
import { response } from 'express';

const API_URL = 'http://localhost:8080/EMS';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  // cancelTicket(ticketId: number) {
    
  // }
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  bookTicket(ticketData: {
    eventId: number;
    userId: number;
    quantity: number;
  }): Observable<any> {
    return this.http.post(`${API_URL}/Ticket/book`, {
      bookingDate: new Date().toISOString(),
      status: "Confirmed",
      eventId: ticketData.eventId,
      userId: ticketData.userId,
      quantity: ticketData.quantity
    }, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      responseType: 'text'  // Add this to expect text response
    }).pipe(
      catchError(error => {
        throw this.handleError(error);
      })
    );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      console.error('An error occurred:', error.error.message);
    } else {
      // Server-side error
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return error;
  }

 getUsersByEventId(eventId: number): Observable<any[]> {
  return this.http.get<any[]>(`${API_URL}/Ticket/event/${eventId}/users`, {
   headers: {
    'Authorization': `Bearer ${this.authService.getToken()}`
   }
  });
 }

 getUserTickets(userId: number): Observable<any[]> {
  return this.http.get<any[]>(`${API_URL}/Ticket/user/${userId}`, {
    headers: {
      'Authorization': `Bearer ${this.authService.getToken()}`
    }
  });
}


}
