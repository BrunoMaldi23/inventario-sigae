module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@inventario/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@inventario/config$': '<rootDir>/../../packages/config/src/index.ts',
    '^@inventario/validation$': '<rootDir>/../../packages/validation/src/index.ts',
  },
};