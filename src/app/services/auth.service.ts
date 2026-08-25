import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { Observable } from 'rxjs';

import { auth } from '../core/firebase';
import { IAuthError, ILoginCredentials, IRegisterCredentials } from '../interfaces/auth.interface';
import { IUser } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly currentUser$: Observable<IUser | null>;

  constructor() {
    this.currentUser$ = new Observable<IUser | null>((subscriber) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => subscriber.next(this.mapUser(user)),
        (error) => subscriber.error(this.mapError(error))
      );

      return () => unsubscribe();
    });
  }

  async login({ email, password }: ILoginCredentials): Promise<IUser> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return this.mapUser(credential.user)!;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async register({ email, password, displayName }: IRegisterCredentials): Promise<IUser> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

      return this.mapUser(credential.user)!;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async loginWithGoogle(): Promise<IUser> {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      return this.mapUser(credential.user)!;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  getCurrentUser(): IUser | null {
    return this.mapUser(auth.currentUser);
  }

  private mapUser(user: User | null): IUser | null {
    if (!user) {
      return null;
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }

  private mapError(error: unknown): IAuthError {
    const code = (error as { code?: string })?.code ?? 'auth/unknown-error';

    const messages: Record<string, string> = {
      'auth/invalid-email': 'O e-mail informado é inválido.',
      'auth/user-disabled': 'Este usuário foi desabilitado.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'Credenciais inválidas.',
      'auth/email-already-in-use': 'Este e-mail já está em uso.',
      'auth/weak-password': 'A senha deve ter no mínimo 6 caracteres.',
      'auth/popup-closed-by-user': 'O login foi cancelado.',
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
      'auth/unknown-error': 'Ocorreu um erro inesperado. Tente novamente.'
    };

    return {
      code,
      message: messages[code] ?? 'Ocorreu um erro ao processar sua solicitação.'
    };
  }
}
