export type AuthPortal = 'jobseeker' | 'reclass';

export const WRONG_PORTAL_MESSAGES: Record<AuthPortal, string> = {
  jobseeker:
    'This account is registered in the Reclassification Portal. Please log in to the Reclassification Portal.',
  reclass:
    'This account is registered in the Jobseeker Portal. Please log in to the Jobseeker Portal.',
};

export const INVALID_CREDENTIALS_MESSAGE =
  'Invalid credentials. Please check your email/item number and password or passcode.';

export function parseAuthPortal(value: unknown): AuthPortal | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'jobseeker' || normalized === 'reclass') {
    return normalized;
  }
  return null;
}

export function validatePortalField(
  value: unknown,
  expected?: AuthPortal,
): { ok: true; portal: AuthPortal } | { ok: false; message: string } {
  if (value === undefined || value === null || value === '') {
    if (expected) {
      return { ok: true, portal: expected };
    }
    return {
      ok: false,
      message: 'Valid portal context (jobseeker or reclass) is required.',
    };
  }

  const parsed = parseAuthPortal(value);
  if (!parsed) {
    return {
      ok: false,
      message: 'Valid portal context (jobseeker or reclass) is required.',
    };
  }

  if (expected && parsed !== expected) {
    return {
      ok: false,
      message:
        expected === 'jobseeker'
          ? 'Invalid portal context for Jobseeker login.'
          : 'Invalid portal context for Reclassification login.',
    };
  }

  return { ok: true, portal: parsed };
}
