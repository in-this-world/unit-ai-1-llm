import { RequestHandler } from 'express';
import OpenAI from 'openai';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { ServerError } from '../types';
import { SYSTEM_PROMPT } from '../prompts/prompts.js';
import { SYSTEM_PROMPT_ReAct } from '../prompts/prompts_ReAct.js';

const openai = new OpenAI();

type IterationLog = {
  iteration: number;
  fileName: string;
  sql: string;
};

const extractSqlQuery = (rawText: string): string => {
  let sqlQuery = rawText.trim();
  if (sqlQuery.includes('```sql')) {
    sqlQuery = sqlQuery.split('```sql')[1].split('```')[0].trim();
  } else if (sqlQuery.includes('```')) {
    sqlQuery = sqlQuery.split('```')[1].split('```')[0].trim();
  }
  return sqlQuery;
};

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
  const selectedPrompt =
    promptType === 'react' ? SYSTEM_PROMPT_ReAct : SYSTEM_PROMPT;
  const iterationCount = res.locals.iterationCount ?? 1;

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const requestLogDirectory = path.resolve(
    process.cwd(),
    'server',
    'logs',
    'sql-iterations',
    requestId
  );

  try {
    await mkdir(requestLogDirectory, { recursive: true });

    const iterationLogs: IterationLog[] = [];

    for (let i = 1; i <= iterationCount; i += 1) {
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

      const sqlQuery = extractSqlQuery(response.output_text);
      const fileName = `iteration-${i}.sql`;
      await writeFile(
        path.join(requestLogDirectory, fileName),
        `${sqlQuery}\n`
      );

      iterationLogs.push({
        iteration: i,
        fileName,
        sql: sqlQuery,
      });
    }

    const distinctQueries = new Set(iterationLogs.map((entry) => entry.sql));

    res.locals.iterationLogs = {
      requestId,
      logDirectory: path.join('server', 'logs', 'sql-iterations', requestId),
      entries: iterationLogs,
    };

    if (distinctQueries.size === 1) {
      res.locals.databaseQuery = iterationLogs[0].sql;
      res.locals.shouldExecuteQuery = true;
    } else {
      res.locals.databaseQuery = '';
      res.locals.databaseQueryResult = [];
      res.locals.shouldExecuteQuery = false;
    }

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
