// src/app/app.component.ts
import { Component } from '@angular/core';
import { AuthService } from './service/auth.service';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent {
  constructor(private authService: AuthService) {}
}
