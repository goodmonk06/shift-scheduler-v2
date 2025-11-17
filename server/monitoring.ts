// Temporary mock - monitoring functionality disabled for deployment
export const monitoring = {
  initializeSentry: () => {},
  startMetricsCollection: (interval: number) => {},
  startHealthChecks: (interval: number) => {},
  trackEvent: (name: string, data?: any) => {},
};
