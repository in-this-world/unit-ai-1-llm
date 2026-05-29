import { RequestHandler } from 'express';
import pg from 'pg';
import { ServerError } from '../types';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_URI,
});

export const queryStarWarsDatabase: RequestHandler = async (
  _req,
  res,
  next
) => {
  if (res.locals.shouldExecuteQuery === false) {
    res.locals.databaseQueryResult = [];
    return next();
  }

  const { databaseQuery } = res.locals;
  if (!databaseQuery) {
    const error: ServerError = {
      log: 'Database query middleware did not receive a query',
      status: 500,
      message: { err: 'An error occurred before querying the database' },
    };
    return next(error);
  }

  // Validate that the query is a SELECT statement
  if (!/^\s*select/i.test(databaseQuery)) {
    const error: ServerError = {
      log: 'Database query middleware received a non-SELECT query',
      status: 500,
      message: { err: 'An error occurred before querying the database' },
    };
    return next(error);
  }

  try {
    const result = await pool.query(databaseQuery);
    res.locals.databaseQueryResult = result.rows;
    return next();
  } catch (err) {
    const error: ServerError = {
      log: `Database query error: ${err instanceof Error ? err.message : String(err)}`,
      status: 500,
      message: { err: 'An error occurred while querying database' },
    };
    return next(error);
  }
};
