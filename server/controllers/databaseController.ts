import { RequestHandler } from 'express';
import { ServerError } from '../types';

export const queryStarWarsDatabase: RequestHandler = async (
  _req,
  res,
  next
) => {
  const { databaseQuery } = res.locals;
  if (!databaseQuery) {
    const error: ServerError = {
      log: 'Database query middleware did not receive a query',
      status: 500,
      message: { err: 'An error occurred before querying the database' },
    };
    return next(error);
  }

  // TODO: Add your code here to execute the SQL query against your Supabase database
  // Use the databaseQuery from res.locals to query the database
  // Store the results in res.locals.databaseQueryResult
  res.locals.databaseQueryResult = [{ name: 'Sly Moore' }]
  return next();
};
