export interface IUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface IUserProfile {
  uid: string;
  nome: string;
  email: string;
  criadoEm: number;
  atualizadoEm: number;
}
