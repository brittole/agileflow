import { Component, OnInit, inject, signal } from '@angular/core';

import { IUserProfile } from '../../interfaces/user.interface';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly profile = signal<IUserProfile | null>(null);
  readonly isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (uid) {
      this.profile.set(await this.userService.getUserProfile(uid));
    }

    this.isLoading.set(false);
  }
}
