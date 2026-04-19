import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApp } from '../server/app';

export const config = {
  runtime: 'nodejs'
};

const app = getApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as unknown as (req: VercelRequest, res: VercelResponse) => void)(req, res);
}
