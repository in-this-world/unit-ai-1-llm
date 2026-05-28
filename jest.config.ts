import type { Config } from 'jest';

const config: Config = {
  moduleNameMapper: {
    './controllers/(.*).js': './controllers/$1.ts',
    './prompts.js': './prompts.ts',
  },
};

export default config;
