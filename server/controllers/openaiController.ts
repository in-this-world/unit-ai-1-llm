import { RequestHandler } from 'express';
import OpenAI from 'openai';
import { ServerError } from '../types';
import { SYSTEM_PROMPT } from './prompts.js';

const openai = new OpenAI();

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

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: `${SYSTEM_PROMPT}\n\nUser Question: ${naturalLanguageQuery}`,
    });

    if (!response || !response.output_text) {
      const error: ServerError = {
        log: 'OpenAI did not return a response',
        status: 500,
        message: { err: 'An error occurred while querying OpenAI' },
      };
      return next(error);
    }

    let sqlQuery = response.output_text.trim();
    // Strip SQL markdown fences if present
    if (sqlQuery.includes('```sql')) {
      sqlQuery = sqlQuery.split('```sql')[1].split('```')[0].trim();
    } else if (sqlQuery.includes('```')) {
      sqlQuery = sqlQuery.split('```')[1].split('```')[0].trim();
    }

    res.locals.databaseQuery = sqlQuery;
    return next();
  } catch (err) {
    const error: ServerError = {
      log: `queryOpenAI: Error: ${err instanceof Error ? err.message : String(err)}`,
      status: 500,
      message: { err: 'An error occurred while querying OpenAI' },
    };
    return next(error);
  }
};
