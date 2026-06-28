// Jest harness for the Expo app. Uses the jest-expo preset (RN/Expo transforms)
// and maps the `@/` path alias to the project root, mirroring tsconfig.json.
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
};
