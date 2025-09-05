/** @type {import('jest').Config} */
module.exports = {
  testTimeout: 30000,
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/.yoyo/'],
  // Node.js 테스트를 위한 추가 환경 설정
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests', '<rootDir>/server'],
      testMatch: [
        '<rootDir>/tests/**/*.test.ts',
        '<rootDir>/server/**/*.test.ts',
        '<rootDir>/server/**/*.test.js'
      ],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          useESM: false,
          tsconfig: {
            moduleResolution: 'node',
            allowSyntheticDefaultImports: true,
            esModuleInterop: true
          }
        }],
      },
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/shared/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      collectCoverageFrom: [
        'server/**/*.{js,ts}',
        'shared/**/*.{js,ts}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/vendor/**',
        '!**/*.config.{js,ts}',
        '!**/dist/**',
      ],
    },
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/client/src'],
      testMatch: [
        '<rootDir>/client/src/**/*.test.tsx',
        '<rootDir>/client/src/**/*.test.ts'
      ],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          useESM: false,
          tsconfig: {
            jsx: 'react-jsx',
            moduleResolution: 'node',
            allowSyntheticDefaultImports: true,
            esModuleInterop: true
          }
        }],
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup-react.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/client/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      collectCoverageFrom: [
        'client/src/**/*.{js,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/vendor/**',
        '!**/*.config.{js,ts}',
        '!**/dist/**',
        '!client/src/main.tsx',
        '!client/src/vite-env.d.ts',
      ],
    }
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};