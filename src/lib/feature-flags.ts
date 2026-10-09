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
