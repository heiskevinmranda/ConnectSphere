export interface AuthLoginInput {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  token: string;
  admin: {
    email: string;
  };
}
