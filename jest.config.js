module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  collectCoverage: true,
  collectCoverageFrom: ['src/*.ts', '!**/node_modules/**'],
  coverageDirectory: './coverage/',
  moduleNameMapper: {
    '^electron$': '<rootDir>/mocks/electronMock.ts'
  }
};
