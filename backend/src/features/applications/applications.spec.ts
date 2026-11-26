const mockQuery = jest.fn();

jest.mock('../../database', () => ({
  pool: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

import { ApplicationsService } from './applications.service';
import { submitReapplication } from './applications.controller';

describe('Jobseeker reapplication workflow', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('allows reapplication strictly when applications.status is Excluded and sets PENDING', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'app-1',
            applicant_id: 42,
            status: 'Excluded',
            application_status: 'Excluded',
            reapplication_status: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'app-1',
            applicant_id: 42,
            status: 'Excluded',
            reapplication_status: 'PENDING',
            reapplied_at: '2026-11-26T06:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await ApplicationsService.submitReapplication('app-1', 42);
    expect(res.reapplication_status).toBe('PENDING');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET reapplication_status = 'PENDING'"),
      ['app-1'],
    );
  });

  it('rejects reapplication with 400 when applications.status is not Excluded', async () => {
    for (const status of ['Pending', 'Application Submitted', 'Qualified', 'Disqualified']) {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'app-2',
            applicant_id: 42,
            status,
            application_status: status,
            reapplication_status: null,
          },
        ],
      });

      await expect(
        ApplicationsService.submitReapplication('app-2', 42),
      ).rejects.toMatchObject({ status: 400 });
    }
  });

  it('enforces ownership check and returns 403 when another applicant submits', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'app-1',
          applicant_id: 99,
          status: 'Excluded',
          reapplication_status: null,
        },
      ],
    });

    await expect(
      ApplicationsService.submitReapplication('app-1', 42),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('allows resubmission when applications.status is Excluded and previous reapplication_status is REJECTED', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'app-1',
            applicant_id: 42,
            status: 'Excluded',
            application_status: 'Excluded',
            reapplication_status: 'REJECTED',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'app-1',
            applicant_id: 42,
            status: 'Excluded',
            reapplication_status: 'PENDING',
            reapplied_at: '2026-11-26T08:00:00.000Z',
            reapplication_reviewed_at: null,
            reapplication_reviewed_by: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await ApplicationsService.submitReapplication('app-1', 42);
    expect(res.reapplication_status).toBe('PENDING');
    expect(res.reapplication_reviewed_at).toBeNull();
    expect(res.reapplication_reviewed_by).toBeNull();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('reapplication_reviewed_at = NULL'),
      ['app-1'],
    );
  });

  it('blocks duplicate reapplications with 409 when reapplication_status is PENDING', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'app-1',
          applicant_id: 42,
          status: 'Excluded',
          reapplication_status: 'PENDING',
        },
      ],
    });
    await expect(
      ApplicationsService.submitReapplication('app-1', 42),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('controller validates payload and returns 400 when applicantId is missing', async () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await submitReapplication(
      { params: { id: 'app-1' }, body: {}, headers: {} } as any,
      { status, json } as any,
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
  });
});
