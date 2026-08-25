export interface ILoginCredentials {
  email: string;
  password: string;
}

export interface IRegisterCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface IAuthError {
  code: string;
  message: string;
}
