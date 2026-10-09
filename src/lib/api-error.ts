import axios from 'axios';
import { ApiResponse } from '@/types/api';

/**
 * User-facing message for a failed request. Prefers the backend's own message
 * (400/403/404/409 all carry one) and appends validation details when present.
 */
export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (axios.isAxiosError<ApiResponse>(error)) {
    const body = error.response?.data;
    if (body?.message) {
      return body.errors?.length ? `${body.message}: ${body.errors.join('; ')}` : body.message;
    }
    if (!error.response) return 'Unable to reach the server. Please check your connection.';
    return fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
};
