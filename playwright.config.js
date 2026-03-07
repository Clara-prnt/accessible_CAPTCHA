export default {
  testDir: './tests',
  testMatch: ['**/*.spec.js'],
  testIgnore: ['**/*.test.js'],
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
};