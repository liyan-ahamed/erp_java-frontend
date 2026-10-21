/**
 * Gradebook / Score (assessments, grade entry, My Grades, internal marks) is ON, matching the
 * backend dev profile (features.gradebook.enabled=true). Set NEXT_PUBLIC_FEATURE_GRADEBOOK=false
 * to hide it again together with the backend flag (FEATURES_GRADEBOOK_ENABLED=false); the pages
 * then show "not found" and no marking APIs are called.
 *
 * If only the backend switches it off, the marking endpoints answer 404: Gradebook queries do not
 * retry or poll on 404 (see hooks/useGradebook.ts) and the pages show the backend's message.
 */
export const isGradebookEnabled = (): boolean => process.env.NEXT_PUBLIC_FEATURE_GRADEBOOK !== 'false';

/**
 * Frontend feature switches that are not driven by environment variables. Portfolio Analytics is OFF:
 * its link is hidden for every role and /dashboard/portfolio/analytics redirects before any analytics
 * API is called. The analytics page code is kept; flip `enabled` to bring it back.
 */
export const features = {
  portfolioAnalytics: { enabled: false },
  /**
   * Self-service email / password change in Account Settings. OFF until the backend exposes
   * PUT /auth/me/email and PUT /auth/me/password; while off the forms are shown disabled and never submit.
   */
  accountSelfService: { enabled: false },
} as const;

export const isPortfolioAnalyticsEnabled = (): boolean => features.portfolioAnalytics.enabled;
