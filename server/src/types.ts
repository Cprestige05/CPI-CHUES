export type Role = 'CLIENT' | 'AGENT_CPI' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  approved: boolean;              // compte validé par l'admin (le personnel l'est d'office)
  assignedAgentId: string | null; // agent CPI attribué (clients uniquement)
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
