import axios from 'axios';
import { apiClient, APP_SLUG } from './client';

/**
 * Validate paywall reviewer-access credentials server-side. The backend
 * unlocks only when the per-app review button is enabled and both stored
 * credentials match, so the real password never ships to the app.
 *
 * Returns true when the backend unlocks premium, false when it rejects the
 * credentials (wrong login/password, or the unlock is disabled). Throws on
 * network/unexpected errors so the caller can show a distinct retry message.
 */
export async function reviewerUnlock(login: string, password: string): Promise<boolean> {
  try {
    const { data } = await apiClient.post<{ unlocked: boolean }>(
      `/apps/${APP_SLUG}/reviewer-unlock`,
      { login, password },
    );
    return data?.unlocked === true;
  } catch (err) {
    // 403 = wrong credentials / unlock disabled, 422 = empty fields. Both are
    // normal "rejected" outcomes, not errors to surface as a network failure.
    if (axios.isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 422)) {
      return false;
    }
    throw err;
  }
}
