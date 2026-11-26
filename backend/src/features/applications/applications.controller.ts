import { NextFunction, Request, Response } from 'express';
import { ApplicantsService } from '../../applicants/applicants.service';
import {
  ApplicationsService,
  validateApplicationReadiness,
} from './applications.service';
import { validateReapplicationRequest } from './applications.validation';

export async function applyJob(req: Request, res: Response) {
  try {
    const { applicantId, jobTitle, positionId } = req.body;
    if (!applicantId) {
      return res.status(400).json({ message: 'Applicant ID is required' });
    }

    const applicant = await ApplicantsService.findOne(Number(applicantId));
    if (!applicant) {
      return res.status(404).json({ message: 'Applicant profile not found' });
    }

    const validationError = validateApplicationReadiness(applicant);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await ApplicantsService.applyJob(
      req.body.applicantId,
      req.body.jobTitle,
      req.body.positionId,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error applying to job:', error);
    res
      .status(500)
      .json({ message: error.message || 'Error saving job application' });
  }
}

export async function getApplications(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (isNaN(id)) return next();
  try {
    const applications = await ApplicantsService.findApplications(id);
    res.json({ success: true, data: applications });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    res
      .status(500)
      .json({ message: error.message || 'Error fetching applications' });
  }
}

export async function toggleSavedJob(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (isNaN(id)) return next();
  try {
    const result = await ApplicantsService.toggleSavedJob(
      id,
      req.body.positionId,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error toggling saved job:', error);
    res
      .status(500)
      .json({ message: error.message || 'Error toggling saved job' });
  }
}

export async function getSavedJobs(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (isNaN(id)) return next();
  try {
    const savedJobs = await ApplicantsService.findSavedJobs(id);
    res.json({ success: true, data: savedJobs });
  } catch (error: any) {
    console.error('Error fetching saved jobs:', error);
    res
      .status(500)
      .json({ message: error.message || 'Error fetching saved jobs' });
  }
}

export async function submitReapplication(req: Request, res: Response) {
  try {
    const validation = validateReapplicationRequest({
      applicationId: req.params.id,
      applicantId:
        req.body?.applicantId ??
        req.params?.applicantId ??
        req.headers['x-applicant-id'],
    });
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const updated = await ApplicationsService.submitReapplication(
      validation.applicationId,
      validation.applicantId,
    );
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    if (status >= 500) {
      console.error('Error submitting reapplication:', error);
    }
    return res
      .status(status)
      .json({ message: error?.message || 'Error submitting reapplication' });
  }
}

