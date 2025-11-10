export const ENV = {
  USE_MOCK: (import.meta.env.VITE_USE_MOCK_API ?? 'false') === 'true',
  PROD: import.meta.env.PROD,
  API_URL: import.meta.env.VITE_API_URL || '',
};
