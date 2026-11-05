import { Injectable, inject } from '@angular/core';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable, of, switchMap } from 'rxjs';

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
    return this.authService.getUidWhenReady$().pipe(
      switchMap((uid) => (uid ? this.watchProjects$(uid) : of([] as Project[]))),
    );
  }

  private watchProjects$(uid: string): Observable<Project[]> {
    // Projetos do usuário = projetos que ele é dono + projetos em que é membro.
    // Duas queries separadas porque o Firestore não tem OR entre campos diferentes.
    const owned$ = new Observable<Project[]>((subscriber) => {
      const q = query(
        collection(db, this.collectionName),
        where('ownerId', '==', uid),
        orderBy('createdAt', 'desc'),
      );
      const unsub = onSnapshot(q,
        (snap) => subscriber.next(snap.docs.map((d) => Project.fromFirestore(d))),
        (err) => subscriber.error(err),
      );
      return () => unsub();
    });

    const member$ = new Observable<Project[]>((subscriber) => {
      // Sem orderBy: array-contains + orderBy exigiria índice composto.
      // A ordenação final é feita no cliente ao combinar as duas listas.
      const q = query(
        collection(db, this.collectionName),
        where('memberIds', 'array-contains', uid),
      );
      const unsub = onSnapshot(q,
        (snap) => subscriber.next(snap.docs.map((d) => Project.fromFirestore(d))),
        (err) => subscriber.error(err),
      );
      return () => unsub();
    });

    // Combina e remove duplicatas (um projeto não pode estar nas duas listas,
    // pois ownerId não está em memberIds, mas garantimos por segurança).
    return new Observable<Project[]>((subscriber) => {
      let owned: Project[] = [];
      let member: Project[] = [];
      let ownedReady = false;
      let memberReady = false;

      const emit = () => {
        if (!ownedReady || !memberReady) return;
        const byId = new Map<string, Project>();
        for (const p of [...owned, ...member]) byId.set(p.id, p);
        const all = [...byId.values()].sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        subscriber.next(all);
      };

      const s1 = owned$.subscribe({ next: (p) => { owned = p; ownedReady = true; emit(); }, error: (e) => subscriber.error(e) });
      const s2 = member$.subscribe({ next: (p) => { member = p; memberReady = true; emit(); }, error: (e) => subscriber.error(e) });

      return () => { s1.unsubscribe(); s2.unsubscribe(); };
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
      memberIds: [],
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

  async getProjectById(projectId: string): Promise<Project | null> {
    const snapshot = await getDoc(doc(db, this.collectionName, projectId));
    return snapshot.exists() ? Project.fromSnapshot(snapshot) : null;
  }

  // Busca um usuário pelo e-mail na coleção userEmails. Retorna null se não existir.
  async findUserByEmail(email: string): Promise<{ uid: string } | null> {
    const snapshot = await getDoc(doc(db, 'userEmails', email.toLowerCase().trim()));
    return snapshot.exists() ? { uid: snapshot.data()['uid'] } : null;
  }

  // Grava memberInfo (nome/email) junto com o uid, pois as regras não permitem
  // que um usuário leia o perfil de outro em users/{uid}.
  async addMember(
    projectId: string,
    memberUid: string,
    memberInfo: { nome: string; email: string },
  ): Promise<void> {
    await updateDoc(doc(db, this.collectionName, projectId), {
      memberIds: arrayUnion(memberUid),
      [`memberInfo.${memberUid}`]: memberInfo,
      updatedAt: serverTimestamp(),
    });
  }

  async removeMember(projectId: string, memberUid: string): Promise<void> {
    await updateDoc(doc(db, this.collectionName, projectId), {
      memberIds: arrayRemove(memberUid),
      [`memberInfo.${memberUid}`]: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }
}
