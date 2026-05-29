import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import 'dotenv/config';

import { parseNaturalLanguageQuery } from './controllers/naturalLanguageController.js';
import { queryOpenAI } from './controllers/openaiController.js';
import { queryStarWarsDatabase } from './controllers/databaseController.js';

import { ServerError } from './types';

const app = express();

app.use(cors());
app.use(express.json());

app.post(
  '/api',
  parseNaturalLanguageQuery,
  queryOpenAI,
  queryStarWarsDatabase,
  (_req, res) => {
    res.status(200).json({
      databaseQuery: res.locals.databaseQuery,
      databaseQueryResult: res.locals.databaseQueryResult,
      iterationLogs: res.locals.iterationLogs,
      executionSkipped: res.locals.shouldExecuteQuery === false,
    });
  }
);

const errorHandler: ErrorRequestHandler = (
  err: ServerError,
  _req,
  res,
  _next
) => {
  const defaultErr: ServerError = {
    log: 'Express error handler caught unknown middleware error',
    status: 500,
    message: { err: 'An error occurred' },
  };
  const errorObj: ServerError = { ...defaultErr, ...err };
  console.log(errorObj.log);
  res.status(errorObj.status).json(errorObj.message);
};

app.use(errorHandler);

export default app;
