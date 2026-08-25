import { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';

import { IProject } from '../interfaces/project.interface';

export class Project implements IProject {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public ownerId: string,
    public createdAt: IProject['createdAt'],
    public updatedAt: IProject['updatedAt'],
  ) {}

  static fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): Project {
    const data = snapshot.data();

    return new Project(
      snapshot.id,
      data['name'],
      data['description'],
      data['ownerId'],
      data['createdAt'] ?? null,
      data['updatedAt'] ?? null,
    );
  }

  static fromSnapshot(snapshot: DocumentSnapshot<DocumentData>): Project {
    const data = snapshot.data()!;

    return new Project(
      snapshot.id,
      data['name'],
      data['description'],
      data['ownerId'],
      data['createdAt'] ?? null,
      data['updatedAt'] ?? null,
    );
  }
}

