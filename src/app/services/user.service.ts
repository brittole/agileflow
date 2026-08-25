import { Injectable } from '@angular/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../core/firebase';
import { IUserProfile } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly collectionName = 'users';

  async createUserProfile(uid: string, nome: string, email: string): Promise<void> {
    const now = Date.now();

    const profile: IUserProfile = {
      uid,
      nome,
      email,
      criadoEm: now,
      atualizadoEm: now
    };

    await setDoc(doc(db, this.collectionName, uid), profile);
  }

  async getUserProfile(uid: string): Promise<IUserProfile | null> {
    const snapshot = await getDoc(doc(db, this.collectionName, uid));
    return snapshot.exists() ? (snapshot.data() as IUserProfile) : null;
  }
}
