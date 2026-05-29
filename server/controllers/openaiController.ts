import { RequestHandler } from 'express';
import OpenAI from 'openai';
import { ServerError } from '../types';
import { SYSTEM_PROMPT } from '../prompts/prompts.js';
import { SYSTEM_PROMPT_ReAct } from '../prompts/prompts_ReAct.js';

const openai = new OpenAI();

export const queryOpenAI: RequestHandler = async (req, res, next) => {
  const { naturalLanguageQuery } = res.locals;
  if (!naturalLanguageQuery) {
    const error: ServerError = {
      log: 'OpenAI query middleware did not receive a query',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    };
    return next(error);
  }

  // Determine prompt to use based on body selection
  const promptType = req.body?.promptType;
  const selectedPrompt = promptType === 'react' ? SYSTEM_PROMPT_ReAct : SYSTEM_PROMPT;

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: `${selectedPrompt}\n\nUser Question: ${naturalLanguageQuery}`,
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
