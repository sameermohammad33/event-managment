import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { EventService } from '../../service/event.service';
import { TicketService } from '../../service/ticket.service';
import { FeedbackService } from '../../service/feedback.service';
import { NotificationService } from '../../service/notification.service';
import { CommonModule, DatePipe } from '@angular/common';
import { interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { error } from 'console';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [CommonModule, ReactiveFormsModule, DatePipe, FormsModule],
  standalone: true,
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
  
  // Get Users Based on Event
  selectedEventId: number | null = null;
  eventUsers: any[] = [];
  showUsersList = false;
  userNotificationMessage = '';

  // Get Feedback for an event
  showEventFeedbacks: { [key: number]: boolean } = {};
  eventFeedbacks: {[key: number]: any[] } = {};

  // Profile Section 
  showProfile = false;
  showUpdateForm = false;
  showChangePasswordForm = false;
  userEvents: any[] = [];

  profileForm: FormGroup;
  passwordForm: FormGroup;
  
   // Ticket booking related
   ticketQuantities: { [eventId: number]: number } = {};




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

    // Profile Section Initialization
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['']
    });

    this.passwordForm = this.fb.group ({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    },
    { validator: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Load user information
    this.userRole = this.authService.getUserRole();
    this.userName = localStorage.getItem('user_name');
    this.userEmail = localStorage.getItem('user_email');
    this.userId = Number(localStorage.getItem('user_id'));

    
    // Initialize ticket quantities
    this.ticketQuantities = {};

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

  
   // Ticket quantity methods
getTicketQuantity(eventId: number): number {
  return this.ticketQuantities[eventId] || 1;
}

incrementTicket(eventId: number): void {
  if (!this.ticketQuantities[eventId]) {
    this.ticketQuantities[eventId] = 1;
  }
  const event = this.events.find(e => e.eventId === eventId);
  if (event && this.ticketQuantities[eventId] < 5 && 
      this.ticketQuantities[eventId] < event.availableTickets) {
    this.ticketQuantities[eventId]++;
  }
}

decrementTicket(eventId: number): void {
  if (!this.ticketQuantities[eventId]) {
    this.ticketQuantities[eventId] = 1;
  }
  if (this.ticketQuantities[eventId] > 1) {
    this.ticketQuantities[eventId]--;
  }
}


  // Book ticket for an event (for USER)
  onBookTicket(eventId: number): void {
    const quantity = this.getTicketQuantity(eventId);
    const event = this.events.find(e => e.eventId === eventId);
    
    if (!event || event.availableTickets <= 0) {
      alert('No tickets available for this event!');
      return;
    }
  
    if (this.userId) {
      this.ticketService.bookTicket({
        eventId: eventId,
        userId: this.userId,
        quantity: quantity
      }).subscribe({
        next: (response: any) => {
          alert(response || `Successfully booked ${quantity} ticket(s)!`);
          // Refresh the events list
          this.loadEvents();
          // Reset quantity
          this.ticketQuantities[eventId] = 1;
        },
        error: (err) => {
          console.error('Booking error:', err);
          alert(err.error?.error || err.error?.message || 
                'Ticket booking failed. Please try again.');
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


// load users for an event 
loadUsersForEvent(eventId: number): void {
  this.selectedEventId = eventId;
  this.ticketService.getUsersByEventId(eventId).subscribe({
    next: (users) => {
      this.eventUsers = users;
      this.showUsersList = true;
    },
    error: (err) => {
      console.error('Failed to load users for event', err);
    }
  });
}

sendUserNotification(userId: number): void {
  if (!this.userNotificationMessage.trim()) {
    alert('Please enter a notification message');
    return;
  }
  if (this.selectedEventId) {
    this.notificationService.sendNotification(userId, this.selectedEventId, this.userNotificationMessage).subscribe({
      next: () => {
        alert('Notification sent successfully!');
        this.userNotificationMessage = '';
      },
      error: (err) => {
        alert(`Failed to send notification: ${err.error || 'Unknown error'}`);
      }
    });
  }
}

// Load Feedback Events 
loadEventFeedbacks(eventId: number): void {
  this.feedbackService.getFeedbacksByEvent(eventId).subscribe({
    next: (feedbacks: any[]) => {
      this.eventFeedbacks[eventId] = feedbacks.map(feedback => ({ ...feedback, comments: feedback.comments || feedback.comments, user: feedback.user ||{ name: 'Anonymous'}}));
      this.showEventFeedbacks[eventId] = true;
    },
    error: (err: any) => {
      console.error('Failed to load event feedbacks', err);
      alert('Failed to load feedbacks. Please try again later.');
      if(err.status===403) {
        alert('You do not have permission to view these feedbacks.');
      }
      else {
        alert('Failed to load feedbacks. Please try again later');
      }
    }
  });
}

// Toggle Event Feedbacks
toggleEventFeedbacks(eventId: number): void {
  if (!this.showEventFeedbacks[eventId]) {
    this.loadEventFeedbacks(eventId);
  }
  else {
    this.showEventFeedbacks[eventId] = false;
  }
}

passwordMatchValidator(form: FormGroup) {
  return form.get('newPassword')?.value === form.get('confirmPassword')?.value?null: {mismatch: true};
}

toggleProfile(): void {
  this.showProfile = !this.showProfile;
  if(this.showProfile) {
    this.loadUserEvents();
    this.loadUserDetails();
  }
  else {
    this.showUpdateForm = false;
    this.showChangePasswordForm = false;
  }
}

loadUserEvents(): void {
  if (this.userId) {
    this.ticketService.getUserTickets(this.userId).subscribe({
      next: (tickets: any[]) => {
        this.userEvents = tickets.map(ticket => ({
          ...ticket.event,
          ticketId: ticket.ticketId
        }));
      },
      error: (err: any) => {
        console.error('Failed to load user events', err);
      }
    });
  }
}

loadUserDetails(): void {
  if (this.userId) {
    this.authService.getUserDetails(this.userId).subscribe({
      next: (user: { name: any; email: any; contactNumber: any; }) => {
        this.profileForm.patchValue({
          name: user.name,
          email: user.email,
          contactNumber: user.contactNumber
        });
      },
      error: (err: any) => {
        console.error('Failed to load user details', err);
      }
    });
  }
}

onUpdateProfile(): void {
  if (this.profileForm.valid && this.userId) {
    this.authService.updateUser(this.userId, this.profileForm.value).subscribe({
      next: (response: string) => { // Explicitly type the response
        alert(response || 'Profile updated successfully!');
        this.userName = this.profileForm.value.name;
        this.userEmail = this.profileForm.value.email;
        localStorage.setItem('user_name', this.profileForm.value.name);
        localStorage.setItem('user_email', this.profileForm.value.email);
        this.showUpdateForm = false;
      },
      error: (err) => {
        alert(err.error || 'Failed to update profile. Please try again.');
      }
    });
  }
}

onChangePassword(): void {
  if (this.passwordForm.valid && this.userId) {
    const passwordData = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    };
    
    this.authService.changePassword(this.userId, passwordData).subscribe({
      next: (response: string) => { // Explicitly type the response
        alert(response || 'Password changed successfully!');
        this.passwordForm.reset();
        this.showChangePasswordForm = false;
      },
      error: (err) => {
        alert(err.error || 'Failed to change password. Please check your current password.');
      }
    });
  }
}



// cancelRegistration(ticketId: number): void {
//   if (confirm('Are you sure you want to cancel this registration?')) {
//     this.ticketService.cancelTicket(ticketId).subscribe({
//       next: () => {
//         alert('Registration cancelled successfully!');
//         this.loadUserEvents();
//         this.loadEvents(); // Refresh events list if needed
//       },
//       error: (err) => {
//         alert('Failed to cancel registration. Please try again.');
//       }
//     });
//   }

 }



