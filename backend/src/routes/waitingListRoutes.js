import express from 'express';
import {
  acceptWaitingListOffer,
  cancelWaitingListEntry,
  createWaitingListEntry,
  createWaitingListRules,
  getMyWaitingList,
  declineWaitingListOffer,
  waitingListIdRules
} from '../controllers/waitingListController.js';
import { auth } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(auth, roleMiddleware('patient'));
router.post('/', createWaitingListRules, validate, createWaitingListEntry);
router.get('/my', getMyWaitingList);
router.post('/:id/accept', waitingListIdRules, validate, acceptWaitingListOffer);
router.post('/:id/decline', waitingListIdRules, validate, declineWaitingListOffer);
router.delete('/:id', waitingListIdRules, validate, cancelWaitingListEntry);

export default router;
