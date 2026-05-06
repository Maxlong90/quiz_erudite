import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from './client';

export type ReportContentType = 'question' | 'boolean_question' | 'flashcard';

export type ReportReason =
  | 'incorrect_answer'
  | 'unclear_wording'
  | 'inappropriate'
  | 'broken_media'
  | 'translation_issue'
  | 'other';

export interface ReportPayload {
  contentType: ReportContentType;
  contentId: number;
  reason: ReportReason;
  comment?: string;
  locale?: string;
}

export async function submitReport(payload: ReportPayload): Promise<void> {
  await apiClient.post('/reports', {
    content_type: payload.contentType,
    content_id: payload.contentId,
    reason: payload.reason,
    comment: payload.comment ?? null,
    locale: payload.locale ?? null,
    app_version: Constants.expoConfig?.version ?? null,
    device_id: Platform.OS,
  });
}
