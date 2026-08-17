export type Role = 'CLIENT' | 'AGENT_CPI' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
