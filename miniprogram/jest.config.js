module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/miniprogram/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'miniprogram/utils/**/*.js',
    '!miniprogram/utils/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/miniprogram/tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/miniprogram/$1'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testTimeout: 10000
};