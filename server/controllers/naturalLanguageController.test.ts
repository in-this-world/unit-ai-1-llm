// @ts-nocheck
/// <reference types="jest" />

import { Request, Response, NextFunction } from 'express';
import { parseNaturalLanguageQuery } from './naturalLanguageController';

describe('parseNaturalLanguageQuery', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      locals: {},
    };
    next = jest.fn();
  });

  it('should call next with an error if naturalLanguageQuery is not provided', async () => {
    await parseNaturalLanguageQuery(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith({
      log: 'Natural language query not provided',
      status: 400,
      message: { err: 'An error occurred while parsing the user query' },
    });
  });

  it('should call next with an error if naturalLanguageQuery is not a string', async () => {
    req.body.naturalLanguageQuery = 123;

    await parseNaturalLanguageQuery(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith({
      log: 'Natural language query is not a string',
      status: 400,
      message: { err: 'An error occurred while parsing the user query' },
    });
  });

  it('should set res.locals.naturalLanguageQuery and call next if naturalLanguageQuery is valid', async () => {
    req.body.naturalLanguageQuery = 'valid query';

    await parseNaturalLanguageQuery(req as Request, res as Response, next);

    expect(res.locals!.naturalLanguageQuery).toBe('valid query');
    expect(res.locals!.iterationCount).toBe(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should set res.locals.iterationCount when iterationCount is valid', async () => {
    req.body.naturalLanguageQuery = 'valid query';
    req.body.iterationCount = 3;

    await parseNaturalLanguageQuery(req as Request, res as Response, next);

    expect(res.locals!.naturalLanguageQuery).toBe('valid query');
    expect(res.locals!.iterationCount).toBe(3);
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with an error when iterationCount is invalid', async () => {
    req.body.naturalLanguageQuery = 'valid query';
    req.body.iterationCount = 0;

    await parseNaturalLanguageQuery(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith({
      log: 'Iteration count is invalid',
      status: 400,
      message: { err: 'Iteration count must be an integer between 1 and 10' },
    });
  });

  it('should call next with an error when iterationCount is not an integer', async () => {
    req.body.naturalLanguageQuery = 'valid query';
    req.body.iterationCount = 2.5;

    await parseNaturalLanguageQuery(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith({
      log: 'Iteration count is invalid',
      status: 400,
      message: { err: 'Iteration count must be an integer between 1 and 10' },
    });
  });
});
