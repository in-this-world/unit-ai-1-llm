import { queryOpenAI } from './openaiController';
import { Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';

type MockOpenAI = {
  responses: {
    create: jest.Mock;
  };
};

jest.mock('openai', () => {
  const create = jest.fn();
  const mOpenAI = {
    responses: {
      create,
    },
  };
  return jest.fn(() => mOpenAI);
});

describe('queryOpenAI', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockOpenAI: MockOpenAI;

  beforeEach(() => {
    req = {};
    res = {
      locals: {},
    };
    next = jest.fn();
    mockOpenAI = new OpenAI() as unknown as MockOpenAI;
    mockOpenAI.responses.create.mockReset();
    jest.clearAllMocks();
  });

  it('should return an error if no naturalLanguageQuery is provided', async () => {
    await queryOpenAI(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith({
      log: 'OpenAI query middleware did not receive a query',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    });
  });

  it('should return an error if OpenAI does not return a completion', async () => {
    res.locals!.naturalLanguageQuery = '???';
    (mockOpenAI.responses.create as jest.Mock).mockResolvedValue({
      id: 'resp_123', output_text: '', output: [],
    });

    await queryOpenAI(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        log: 'OpenAI did not return a completion',
        status: 500,
        message: { err: 'An error occurred while querying OpenAI' },
      })
    );
  });

  it('should set res.locals.databaseQuery if OpenAI returns a valid completion', async () => {
    res.locals!.naturalLanguageQuery = 'Name the person with white eyes';
    const sql = "SELECT name FROM public.people WHERE eye_color = 'white';";
    mockOpenAI.responses.create.mockResolvedValue({
      id: 'resp_456',
      output_text: `\`\`\`sql\n${sql}\n\`\`\``,
      // Structured shape for Responses API; your middleware may read this instead
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            { type: 'output_text', text: sql },
          ],
        },
      ],
    });

    await queryOpenAI(req as Request, res as Response, next);

    expect(res.locals!.databaseQuery).toEqual(
      expect.stringContaining(sql)
    );

    expect(next).toHaveBeenCalled();
  });

  it('should return an error if OpenAI throws an error', async () => {
    res.locals!.naturalLanguageQuery = 'Name the person with white eyes';

    (mockOpenAI.responses.create as jest.Mock).mockRejectedValue(
      new Error('OpenAI error')
    );

    await queryOpenAI(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        log: expect.stringContaining('queryOpenAI: Error: OpenAI error'),
        status: 500,
        message: { err: 'An error occurred while querying OpenAI' },
      })
    );
  });
});
