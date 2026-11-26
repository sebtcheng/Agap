export const EXCLUDED_APPLICATION_STATUS = 'Excluded';

export type ReapplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export function isExcludedApplicationStatus(status: unknown): boolean {
  return (
    String(status ?? '')
      .trim()
      .toLowerCase() === EXCLUDED_APPLICATION_STATUS.toLowerCase()
  );
}

export function validateReapplicationRequest(input: {
  applicationId: unknown;
  applicantId: unknown;
}):
  | { ok: true; applicationId: string; applicantId: number }
  | { ok: false; message: string } {
  const applicationId = String(input.applicationId ?? '').trim();
  if (!applicationId) {
    return { ok: false, message: 'Valid application ID is required.' };
  }

  const applicantId = Number(input.applicantId);
  if (!Number.isInteger(applicantId) || applicantId <= 0) {
    return { ok: false, message: 'Authenticated applicant ID is required.' };
  }

  return { ok: true, applicationId, applicantId };
}
