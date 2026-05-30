import { queryOpenAI, verifyQuery } from './openaiController';
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
      create: jest.fn(),
    },
  };
  return jest.fn(() => mOpenAI);
});

describe('queryOpenAI (Responses API)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockOpenAI: any;

  beforeEach(() => {
    req = {};
    res = { locals: {} };
    next = jest.fn();
    mockOpenAI = new OpenAI() as unknown as MockOpenAI;
    mockOpenAI.responses.create.mockReset();
    jest.clearAllMocks();
  });

  it('returns an error if no naturalLanguageQuery is provided', async () => {
    await queryOpenAI(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith({
      log: 'OpenAI query middleware did not receive a query',
      status: 500,
      message: { err: 'An error occurred before querying OpenAI' },
    });
  });

  it('returns an error if OpenAI returns an empty response', async () => {
    res.locals!.naturalLanguageQuery = '???';
    (mockOpenAI.responses.create as jest.Mock).mockResolvedValue({
      output_text: '',
    });

    await queryOpenAI(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        log: 'OpenAI did not return a response',
        status: 500,
        message: { err: 'An error occurred while querying OpenAI' },
      })
    );
  });

  it('should set res.locals.databaseQuery when OpenAI returns a valid response', async () => {
    res.locals!.naturalLanguageQuery = 'Name the person with white eyes';
    const sql = "SELECT name FROM public.people WHERE eye_color = 'white';";
    (mockOpenAI.responses.create as jest.Mock).mockResolvedValue({
      output_text:
        `\`\`\`sql\n${sql}\n\`\`\``,
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

describe('verifyQuery (Cognitive Verifier)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockOpenAI: any;

  beforeEach(() => {
    req = {};
    res = { locals: {} };
    next = jest.fn();
    mockOpenAI = new OpenAI() as unknown as MockOpenAI;
    mockOpenAI.responses.create.mockReset();
    jest.clearAllMocks();
  });

  it('returns an error if no naturalLanguageQuery is provided', async () => {
    await verifyQuery(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith({
      log: 'Verifier middleware did not receive a query',
      status: 500,
      message: { err: 'An error occurred before verifying the query' },
    });
  });

  it('should call next() if the query is verified as valid', async () => {
    res.locals!.naturalLanguageQuery = 'Who is Darth Vader?';
    (mockOpenAI.responses.create as jest.Mock).mockResolvedValue({
      output_text: JSON.stringify({
        valid: true,
        feedback: '',
        suggestions: []
      }),
    });

    await verifyQuery(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should return 200 with validationFailed, feedback and suggestions if query is out-of-scope', async () => {
    res.locals!.naturalLanguageQuery = 'How much is a Tesla?';
    (mockOpenAI.responses.create as jest.Mock).mockResolvedValue({
      output_text: JSON.stringify({
        valid: false,
        feedback: 'Our database contains Star Wars characters, planets, species, and vessels, but no Tesla cars.',
        suggestions: ['Show me all vessels and their cost', 'List all planets', 'How much does a Millennium Falcon cost?']
      }),
    });

    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res.status = statusMock as any;

    await verifyQuery(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      validationFailed: true,
      feedback: 'Our database contains Star Wars characters, planets, species, and vessels, but no Tesla cars.',
      suggestions: ['Show me all vessels and their cost', 'List all planets', 'How much does a Millennium Falcon cost?']
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should fallback by calling next() on verification error (robustness)', async () => {
    res.locals!.naturalLanguageQuery = 'Who is Darth Vader?';
    (mockOpenAI.responses.create as jest.Mock).mockRejectedValue(
      new Error('OpenAI connection failed')
    );

    await verifyQuery(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should fallback by calling next() on invalid JSON response (robustness)', async () => {
    res.locals!.naturalLanguageQuery = 'Who is Darth Vader?';
    (mockOpenAI.responses.create as jest.Mock).mockResolvedValue({
      output_text: 'Invalid plain text response from LLM',
    });

    await verifyQuery(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
