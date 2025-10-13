import { RequestHandler } from 'express';
import { ServerError } from '../types';

export const queryOpenAI: RequestHandler = async (_req, res, next) => {
  const { naturalLanguageQuery } = res.locals;
  if (!naturalLanguageQuery) {
    const error: ServerError = {
      log: 'OpenAI query middleware did not receive a query',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    };
    return next(error);
  }
  // TODO: Add your code here to call the OpenAI Responses API
  // Use the naturalLanguageQuery to generate a SQL query
  // Store the generated SQL in res.locals.databaseQuery
  res.locals.databaseQuery =
    "SELECT name FROM public.people WHERE eye_color = 'white';";
  return next();
};
