import type { Request } from 'express';

export interface AuthTokenPayload {
  contributorId: string;
  stellarAddress: string;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  contributor?: {
    id: string;
    stellarAddress: string;
  };
}
