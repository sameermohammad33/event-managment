import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:8080/EMS';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  submitFeedback(feedbackData: {
    comments: string;
    rating: number;
    event: { eventId: number };
    user: { userId: number };
  }): Observable<any> {
    // Add current timestamp
    const feedbackWithTimestamp = {
      ...feedbackData,
      submitted_timestamp: new Date().toISOString()
    };

    return this.http.post(`${API_URL}/Feedback/create`, feedbackWithTimestamp, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      responseType: 'text'
    });
  }

  getEventFeedbacks(eventId: number): Observable<any> {
    return this.http.get(`${API_URL}/Feedback/readAll`, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      }
    });
  }

  getAverageRating(eventId: number): Observable<number> {
    return this.http.get<number>(`${API_URL}/Feedback/getAverageRating/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      }
    });
  }
}
