import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';

import { db } from '../core/firebase';
import { ICreateProject } from '../interfaces/project.interface';
import { Project } from '../models/project.model';
import { AuthService } from './auth.service';
import { CardService } from './card.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly authService = inject(AuthService);
  private readonly cardService = inject(CardService);
  private readonly collectionName = 'projects';

  getProjects$(): Observable<Project[]> {
    return new Observable<Project[]>((subscriber) => {
      const uid = this.authService.getCurrentUser()?.uid;

      if (!uid) {
        subscriber.next([]);
        subscriber.complete();
        return;
      }

      const projectsQuery = query(
        collection(db, this.collectionName),
        where('ownerId', '==', uid),
        orderBy('createdAt', 'desc'),
      );

      const unsubscribe = onSnapshot(
        projectsQuery,
        (snapshot) => subscriber.next(snapshot.docs.map((doc) => Project.fromFirestore(doc))),
        (error) => subscriber.error(error),
      );

      return () => unsubscribe();
    });
  }

  getProjectById$(projectId: string): Observable<Project | null> {
    return new Observable<Project | null>((subscriber) => {
      const projectRef = doc(db, this.collectionName, projectId);

      const unsubscribe = onSnapshot(
        projectRef,
        (snapshot) => subscriber.next(snapshot.exists() ? Project.fromSnapshot(snapshot) : null),
        (error) => subscriber.error(error),
      );

      return () => unsubscribe();
    });
  }

  async createProject({ name, description }: ICreateProject): Promise<void> {
    const uid = this.authService.getCurrentUser()?.uid;

    if (!uid) {
      throw new Error('Usuário não autenticado.');
    }

    await addDoc(collection(db, this.collectionName), {
      name,
      description,
      ownerId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async updateProject(
    projectId: string,
    data: { name: string; description: string },
  ): Promise<void> {
    await updateDoc(doc(db, this.collectionName, projectId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  // Cards are removed first so no orphan cards remain once the project is gone.
  async deleteProject(projectId: string): Promise<void> {
    await this.cardService.deleteCardsByProject(projectId);
    await deleteDoc(doc(db, this.collectionName, projectId));
  }
}
