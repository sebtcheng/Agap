import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';

const mockQuery = jest.fn();
const mockSendPasswordResetEmail = jest.fn();

jest.mock('../../database', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

jest.mock('../../utils/mailer', () => ({
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
}));

import { ApplicantsService } from '../../applicants/applicants.service';
import { ApplicantProfileService } from '../applicant-profile/applicant-profile.service';
import * as authController from './auth.controller';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: any };
}

describe('Portal-Level Authentication & Password-Reset Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_portal_secret';
  });

  describe('Login isolation & wrong-portal guidance', () => {
    it('blocks reclass_gc-only users from Jobseeker Portal login (password) with 403 guidance to Reclassification Portal', async () => {
      // 1st query: applicants -> empty
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 2nd query: reclass_gc -> found
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }] });

      const req = {
        body: {
          email_address: 'incumbent@deped.gov.ph',
          password: 'Password123',
          loginMethod: 'password',
          portal: 'jobseeker',
        },
      } as unknown as Request;
      const res = createMockRes();

      await authController.login(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe(
        'This account is registered in the Reclassification Portal. Please log in to the Reclassification Portal.',
      );
      expect(res.body.correctPortal).toBe('reclass');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(String(mockQuery.mock.calls[0][0])).toContain('FROM applicants');
      expect(String(mockQuery.mock.calls[1][0])).toContain('FROM reclass_gc');
    });

    it('blocks reclass_gc-only users from Jobseeker Portal login (6-digit passcode) with 403 guidance to Reclassification Portal', async () => {
      // 1st query: applicants -> empty
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 2nd query: reclass_gc -> found
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 43 }] });

      const req = {
        body: {
          email_address: 'RILMA.SANTIAGO@DEPED.GOV.PH',
          password: '123456',
          loginMethod: 'passcode',
          portal: 'jobseeker',
        },
      } as unknown as Request;
      const res = createMockRes();

      await authController.login(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe(
        'This account is registered in the Reclassification Portal. Please log in to the Reclassification Portal.',
      );
      expect(res.body.correctPortal).toBe('reclass');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(String(mockQuery.mock.calls[0][0])).toContain('FROM applicants');
      expect(String(mockQuery.mock.calls[1][0])).toContain('FROM reclass_gc');
    });

    it('blocks reclass-registered users with a linked applicants row (registrant_type=reclass) from Jobseeker Portal login with 403', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 44,
            email_address: 'incumbent.linked@deped.gov.ph',
            registrant_type: 'reclass',
            passcode: '123456',
          },
        ],
      });

      const req = {
        body: {
          email_address: 'incumbent.linked@deped.gov.ph',
          password: '123456',
          loginMethod: 'passcode',
          portal: 'jobseeker',
        },
      } as unknown as Request;
      const res = createMockRes();

      await authController.login(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe(
        'This account is registered in the Reclassification Portal. Please log in to the Reclassification Portal.',
      );
      expect(res.body.correctPortal).toBe('reclass');
    });

    it('blocks applicants-only users from Reclassification Portal login (password) with 403 guidance to Jobseeker Portal', async () => {
      // 1st query: reclass_gc -> empty
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 2nd query: applicants -> found
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 99 }] });

      const req = {
        body: {
          email: 'jobseeker@gmail.com',
          password: 'Password123',
          loginMethod: 'password',
          portal: 'reclass',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;
      const res = createMockRes();

      await authController.reclassLogin(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe(
        'This account is registered in the Jobseeker Portal. Please log in to the Jobseeker Portal.',
      );
      expect(res.body.correctPortal).toBe('jobseeker');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(String(mockQuery.mock.calls[0][0])).toContain('FROM reclass_gc');
      expect(String(mockQuery.mock.calls[1][0])).toContain('FROM applicants');
    });

    it('blocks applicants-only users from Reclassification Portal login (6-digit passcode) with 403 guidance to Jobseeker Portal', async () => {
      // 1st query: reclass_gc -> empty
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // 2nd query: applicants -> found
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 100 }] });

      const req = {
        body: {
          email: 'catapangkleinzebastian@gmail.com',
          passcode: '123456',
          loginMethod: 'passcode',
          portal: 'reclass',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;
      const res = createMockRes();

      await authController.reclassLogin(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe(
        'This account is registered in the Jobseeker Portal. Please log in to the Jobseeker Portal.',
      );
      expect(res.body.correctPortal).toBe('jobseeker');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(String(mockQuery.mock.calls[0][0])).toContain('FROM reclass_gc');
      expect(String(mockQuery.mock.calls[1][0])).toContain('FROM applicants');
    });

    it('returns standard invalid credentials message (401) without correctPortal for valid-portal wrong-password attempts', async () => {
      const correctHash = await bcrypt.hash('CorrectPass123', 4);
      // Jobseeker portal: exists in applicants, wrong password
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 55,
            email_address: 'valid@example.com',
            password_hash: correctHash,
          },
        ],
      });
      const jobReq = {
        body: {
          email_address: 'valid@example.com',
          password: 'WrongPassword',
          loginMethod: 'password',
          portal: 'jobseeker',
        },
      } as unknown as Request;
      const jobRes = createMockRes();
      await authController.login(jobReq, jobRes);

      expect(jobRes.statusCode).toBe(401);
      expect(jobRes.body.message).toBe(
        'Invalid credentials. Please check your email/item number and password or passcode.',
      );
      expect(jobRes.body.correctPortal).toBeUndefined();

      // Reclassification portal: exists in reclass_gc, wrong password
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 56,
            email: 'valid.reclass@deped.gov.ph',
            password_hash: correctHash,
            initial_reclass_psi_cd: 'OSEC-DECSB-GC-99',
          },
        ],
      });
      const reclassReq = {
        body: {
          email: 'valid.reclass@deped.gov.ph',
          password: 'WrongPassword',
          loginMethod: 'password',
          portal: 'reclass',
        },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;
      const reclassRes = createMockRes();
      await authController.reclassLogin(reclassReq, reclassRes);

      expect(reclassRes.statusCode).toBe(401);
      expect(reclassRes.body.message).toBe(
        'Invalid credentials. Please check your email/item number and password or passcode.',
      );
      expect(reclassRes.body.correctPortal).toBeUndefined();
    });

    it('authenticates dual-account Reclassification login strictly against reclass_gc without falling back to applicants', async () => {
      const reclassPasswordHash = await bcrypt.hash('ReclassPass123', 4);
      // Query reclass_gc -> returns row with ReclassPass123
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 501,
            email: 'dual@deped.gov.ph',
            password_hash: reclassPasswordHash,
            initial_reclass_psi_cd: 'OSEC-DECSB-GC-01',
            incumbent: 'DELA CRUZ, JUAN',
          },
        ],
      });

      // Attempt Reclass login using the Jobseeker password instead of Reclass password -> must fail (null)
      const failed = await ApplicantsService.authenticateReclassAccount(
        'dual@deped.gov.ph',
        'JobseekerPass123',
        'password',
      );
      expect(failed).toBeNull();
      // Must NOT have queried applicants for credential fallback
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(String(mockQuery.mock.calls[0][0])).toContain('FROM reclass_gc');
    });

    it('rejects mismatched portal parameter on login endpoints with 400', async () => {
      const req = {
        body: {
          email_address: 'user@example.com',
          password: 'Password123',
          portal: 'reclass',
        },
      } as unknown as Request;
      const res = createMockRes();

      await authController.login(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('Forgot & Reset Password isolation for dual-account users', () => {
    it('Jobseeker forgot-password and reset-password only query and mutate applicants (never reclass_gc)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 101, target_email: 'dual@deped.gov.ph' }],
      });
      mockSendPasswordResetEmail.mockResolvedValueOnce(true);

      const sent = await ApplicantProfileService.forgotPassword(
        'dual@deped.gov.ph',
        'jobseeker',
        'https://agap.example.com',
      );
      expect(sent).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(String(mockQuery.mock.calls[0][0])).toContain('FROM applicants');
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        'dual@deped.gov.ph',
        expect.any(String),
        'https://agap.example.com',
        'jobseeker',
      );

      const issuedToken = mockSendPasswordResetEmail.mock.calls[0][1] as string;
      const decoded: any = jwt.verify(issuedToken, 'test_portal_secret');
      expect(decoded.portal).toBe('jobseeker');
      expect(decoded.accountId).toBe(101);

      // Now execute resetPassword for jobseeker
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 101 }] });
      const resetOk = await ApplicantProfileService.resetPassword(
        issuedToken,
        'NewJobseekerPass123',
        'jobseeker',
      );
      expect(resetOk).toBe(true);
      // Only 1 UPDATE query executed (total 2 queries including forgotPassword SELECT)
      expect(mockQuery).toHaveBeenCalledTimes(2);
      const updateSql = String(mockQuery.mock.calls[1][0]);
      expect(updateSql).toContain('UPDATE applicants SET password_hash');
      expect(updateSql).not.toContain('reclass_gc');
    });

    it('Reclassification forgot-password and reset-password only query and mutate reclass_gc (never applicants)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 202, target_email: 'dual@deped.gov.ph' }],
      });
      mockSendPasswordResetEmail.mockResolvedValueOnce(true);

      const sent = await ApplicantProfileService.forgotPassword(
        'dual@deped.gov.ph',
        'reclass',
        'https://agap.example.com',
      );
      expect(sent).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(String(mockQuery.mock.calls[0][0])).toContain('FROM reclass_gc');
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        'dual@deped.gov.ph',
        expect.any(String),
        'https://agap.example.com',
        'reclass',
      );

      const issuedToken = mockSendPasswordResetEmail.mock.calls[0][1] as string;
      const decoded: any = jwt.verify(issuedToken, 'test_portal_secret');
      expect(decoded.portal).toBe('reclass');
      expect(decoded.accountId).toBe(202);

      // Now execute resetPassword for reclass
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 202 }] });
      const resetOk = await ApplicantProfileService.resetPassword(
        issuedToken,
        'NewReclassPass123',
        'reclass',
      );
      expect(resetOk).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      const updateSql = String(mockQuery.mock.calls[1][0]);
      expect(updateSql).toContain('UPDATE reclass_gc SET password_hash');
      expect(updateSql).not.toContain('applicants');
    });

    it('rejects cross-portal password reset token replay without mutating any table', async () => {
      const jobseekerToken = jwt.sign(
        { accountId: 101, applicantId: 101, portal: 'jobseeker' },
        'test_portal_secret',
        { expiresIn: '1h' },
      );

      await expect(
        ApplicantProfileService.resetPassword(
          jobseekerToken,
          'AttemptedCrossReset123',
          'reclass',
        ),
      ).rejects.toThrow('Invalid or expired token');

      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('requires valid portal context on forgot-password and reset-password controller endpoints', async () => {
      const fpReq = {
        body: { email: 'dual@deped.gov.ph' },
        headers: {},
      } as unknown as Request;
      const fpRes = createMockRes();
      await authController.forgotPassword(fpReq, fpRes);
      expect(fpRes.statusCode).toBe(400);

      const rpReq = {
        body: { token: 'abc', new_password: 'NewPassword123' },
      } as unknown as Request;
      const rpRes = createMockRes();
      await authController.resetPassword(rpReq, rpRes);
      expect(rpRes.statusCode).toBe(400);
    });
  });
});
