import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApp } from '../server/app.js';

const app = getApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const originalRaw =
    headers['x-vercel-original-pathname'] ??
    headers['x-matched-path'] ??
    headers['x-vercel-original-url'];
  const original = Array.isArray(originalRaw) ? originalRaw[0] : originalRaw;

  if (original && req.url) {
    const queryIndex = req.url.indexOf('?');
    req.url = queryIndex >= 0 ? `${original}${req.url.slice(queryIndex)}` : original;
  }

  return (app as unknown as (req: VercelRequest, res: VercelResponse) => void)(req, res);
}
