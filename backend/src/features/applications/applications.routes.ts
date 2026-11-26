import { Router } from 'express';
import * as controller from './applications.controller';

const router = Router();

router.post('/apply-job', controller.applyJob);
router.get('/:id/applications', controller.getApplications);
router.post('/:applicantId/applications/:id/reapply', controller.submitReapplication);
router.post('/:id/save-job', controller.toggleSavedJob);
router.get('/:id/saved-jobs', controller.getSavedJobs);

export const reapplyRouter = Router();
reapplyRouter.post('/:id/reapply', controller.submitReapplication);

export default router;
