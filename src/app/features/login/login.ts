import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { IAuthError } from '../../interfaces/auth.interface';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      await this.authService.login(this.form.getRawValue());
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.errorMessage.set((error as IAuthError).message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onGoogleLogin(): Promise<void> {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    try {
      await this.authService.loginWithGoogle();
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.errorMessage.set((error as IAuthError).message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
