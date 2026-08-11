import type { RequestHandler } from 'express';

export const preventPrivateResponseCaching: RequestHandler = (
  _request,
  response,
  next,
) => {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Expires', '0');
  response.setHeader('Pragma', 'no-cache');
  next();
};
