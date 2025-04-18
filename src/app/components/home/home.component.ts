import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { EventService } from '../../service/event.service';
import { TicketService } from '../../service/ticket.service';
import { FeedbackService } from '../../service/feedback.service';
import { NotificationService } from '../../service/notification.service';
import { CommonModule, DatePipe } from '@angular/common';
import { interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  // User information
  userRole: string | null = null;
  userName: string | null = null;
  userEmail: string | null = null;
  userId: number | null = null;

  // Event related
  events: any[] = [];
  showEventForm = false;
  eventForm: FormGroup;
  isEditing = false;
  currentEventId: number | null = null;

  // Feedback related
  showFeedbackForm: { [key: number]: boolean } = {};
  feedbackForm: FormGroup;
  eventRatings: { [key: number]: number } = {};

  // Notification related
  private notificationRefreshInterval = 30000;
  showNotification = false;
  notifications: any[] = [];
  currentNotification: any = null;
  notificationForm: FormGroup;

  constructor(
    private authService: AuthService,
    private eventService: EventService,
    private ticketService: TicketService,
    private feedbackService: FeedbackService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    // Initialize event creation/editing form
    this.eventForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      location: ['', Validators.required],
      date: ['', Validators.required],
      availableTickets: ['', [Validators.required, Validators.min(1)]]
    });

    // Initialize feedback form
    this.feedbackForm = this.fb.group({
      comments: ['', Validators.required],
      rating: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      eventId: ['', Validators.required]
    });

    // Initialize notification form (for admin) 
    this.notificationForm = this.fb.group({
      eventId: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    // Load user information
    this.userRole = this.authService.getUserRole();
    this.userName = localStorage.getItem('user_name');
    this.userEmail = localStorage.getItem('user_email');
    this.userId = Number(localStorage.getItem('user_id'));

    // Load events if user is logged in
    if (this.userRole === 'USER' || this.userRole === 'ADMIN') {
      this.loadEvents();
    }

    // Load notifications for user
    if (this.userRole === 'USER' && this.userId) {
      this.loadNotifications();
    }

    // Set up notification polling
    if (this.userRole === 'USER' && this.userId) {
      this.setupNotificationPolling();
    }

  }

  // Load all events
  loadEvents(): void {
    this.eventService.getAllEvents().subscribe({
      next: (events) => {
        this.events = events;
        // Load average ratings for each event
        this.events.forEach(event => {
          this.loadAverageRating(event.eventId);
        });
      },
      error: (err) => {
        console.error('Failed to load events', err);
      }
    });
  }

  // Toggle event creation/editing form (for ADMIN)
  toggleEventForm(eventId: number | null = null): void {
    if (eventId) {
      this.isEditing = true;
      this.currentEventId = eventId;
      this.eventService.getEventById(eventId).subscribe({
        next: (event) => {
          this.eventForm.patchValue({
            name: event.name,
            category: event.category,
            location: event.location,
            date: event.date,
            availableTickets: event.availableTickets
          });
          this.showEventForm = true;
        },
        error: (err) => {
          console.error('Failed to load event for editing', err);
        }
      });
    } else {
      this.isEditing = false;
      this.currentEventId = null;
      this.eventForm.reset();
      this.showEventForm = !this.showEventForm;
    }
  }

  // Create or Update event (for ADMIN)
  onSubmitEvent(): void {
    if (this.eventForm.valid && this.userId) {
      const eventData = {
        ...this.eventForm.value,
        organizer: {
          userId: this.userId
        }
      };

      if (this.isEditing && this.currentEventId) {
        this.eventService.updateEvent(this.currentEventId, eventData).subscribe({
          next: (response) => {
            alert('Event updated successfully!');
            this.resetEventForm();
            this.loadEvents();
          },
          error: (err) => {
            alert(`Event update failed: ${err.error || 'Unknown error'}`);
          }
        });
      } else {
        this.eventService.createEvent(eventData).subscribe({
          next: (response) => {
            alert('Event created successfully!');
            this.resetEventForm();
            this.loadEvents();
          },
          error: (err) => {
            alert(`Event creation failed: ${err.error || 'Unknown error'}`);
          }
        });
      }
    }
  }

  private resetEventForm(): void {
    this.showEventForm = false;
    this.isEditing = false;
    this.currentEventId = null;
    this.eventForm.reset();
  }

  // Book ticket for an event (for USER)
  onBookTicket(eventId: number): void {
    if (this.userId) {
      const ticketData = {
        bookingDate: new Date().toISOString(),
        status: "Confirmed",
        event: { eventId: eventId },
        user: { userId: this.userId }
      };

      this.ticketService.bookTicket(ticketData).subscribe({
        next: (response) => {
          alert('Ticket booked successfully!');
          this.loadEvents();
        },
        error: (err) => {
          alert(`Ticket booking failed: ${err.error || 'Unknown error'}`);
        }
      });
    }
  }

  // Toggle feedback form for a specific event
  toggleFeedbackForm(eventId: number): void {
    this.showFeedbackForm[eventId] = !this.showFeedbackForm[eventId];
    if (this.showFeedbackForm[eventId]) {
      this.feedbackForm.patchValue({
        eventId: eventId
      });
      this.loadAverageRating(eventId);
    }
  }

  // Load average rating for an event
  loadAverageRating(eventId: number): void {
    this.feedbackService.getAverageRating(eventId).subscribe({
      next: (rating) => {
        this.eventRatings[eventId] = rating;
      },
      error: (err) => {
        console.error('Failed to load average rating', err);
      }
    });
  }

  // Submit feedback for an event
  onSubmitFeedback(): void {
    if (this.feedbackForm.valid && this.userId) {
      const feedbackData = {
        comments: this.feedbackForm.value.comments,
        rating: this.feedbackForm.value.rating,
        event: { eventId: this.feedbackForm.value.eventId },
        user: { userId: this.userId },
        submitted_timestamp: new Date().toISOString()
      };

      this.feedbackService.submitFeedback(feedbackData).subscribe({
        next: (response) => {
          alert('Feedback submitted successfully!');
          this.showFeedbackForm[this.feedbackForm.value.eventId] = false;
          this.feedbackForm.reset();
          this.loadAverageRating(this.feedbackForm.value.eventId);
        },
        error: (err) => {
          alert(`Feedback submission failed: ${err.error || 'Unknown error'}`);
        }
      });
    }
  }

  // Delete event
  onDeleteEvent(eventId: number): void {
    if (confirm('Are you sure you want to delete this event?')) {
      this.eventService.deleteEvent(eventId).subscribe({
        next: (response) => {
          alert('Event deleted successfully!');
          this.loadEvents();
        },
        error: (err) => {
          alert(`Event deletion failed: ${err.error || 'Unknown error'}`);
        }
      });
    }
  }

  // Logout user
  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }


 // Load notifications for user
 loadNotifications(): void {
  this.notificationService.getUserNotifications(this.userId!).subscribe({
    next: (notifications) => {
      this.notifications = notifications;
      if (this.notifications.length > 0) {
        this.showNextNotification();
      }
    },
    error: (err) => {
      console.error('Failed to load notifications', err);
    }
  });
}

// Show next notification in queue
showNextNotification(): void {
  if (this.notifications.length > 0) {
    this.currentNotification = this.notifications[0];
    this.showNotification = true;
  }
}

// Close current notification
closeNotification(notificationId: number): void {
  this.notificationService.deleteNotification(notificationId).subscribe({
    next: () => {
      this.showNotification = false;
      this.notifications = this.notifications.filter(n => n.notificationId !== notificationId);
      setTimeout(() => this.showNextNotification(), 500);
    },
    error: (err) => {
      console.error('Failed to delete notification', err);
    }
  });
}
 
// Admin sends notification
onSendNotification(): void {
  if (this.notificationForm.valid) {
    const eventId = this.notificationForm.value.eventId;
    const message = this.notificationForm.value.message;

    this.notificationService.sendNotification(this.userId!, eventId, message).subscribe({
      next: (response) => {
        alert('Notification sent successfully!');
        this.notificationForm.reset();
      },
      error: (err) => {
        alert(`Failed to send notification: ${err.error || 'Unknown error'}`);
      }
    });
  }
}

// Notification Polling 
private setupNotificationPolling() : void {
  interval(this.notificationRefreshInterval)
  .pipe(
    startWith(0),
    switchMap(() => this.notificationService.getUserNotifications(this.userId!))
  )
  .subscribe({
    next: (notifications) => {
      this.notifications = notifications;
      if (this.notifications.length > 0 && !this.currentNotification) {
        this.showNextNotification();
      }
    },
    error: (err) => {
      console.error(err);
    }
  })
}

}

