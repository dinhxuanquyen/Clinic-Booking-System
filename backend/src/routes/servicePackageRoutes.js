import express from 'express';
import {
  createAdminServicePackage,
  deleteAdminServicePackage,
  getPublicServicePackageById,
  listAdminServicePackages,
  listDoctorServicePackages,
  listPublicServicePackages,
  publicServicePackageQueryRules,
  servicePackageIdRule,
  servicePackageRules,
  servicePackageStatusRules,
  updateAdminServicePackage,
  updateAdminServicePackageStatus
} from '../controllers/servicePackageController.js';
import { auth } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
export const adminServicePackageRouter = express.Router();
export const doctorServicePackageRouter = express.Router();

router.get('/', publicServicePackageQueryRules, validate, listPublicServicePackages);
router.get('/:id', servicePackageIdRule, validate, getPublicServicePackageById);

adminServicePackageRouter.use(auth, roleMiddleware('admin'));
adminServicePackageRouter.get('/', listAdminServicePackages);
adminServicePackageRouter.post('/', servicePackageRules, validate, createAdminServicePackage);
adminServicePackageRouter.patch('/:id', servicePackageIdRule, servicePackageRules, validate, updateAdminServicePackage);
adminServicePackageRouter.patch('/:id/status', servicePackageStatusRules, validate, updateAdminServicePackageStatus);
adminServicePackageRouter.delete('/:id', servicePackageIdRule, validate, deleteAdminServicePackage);

doctorServicePackageRouter.get('/', auth, roleMiddleware('doctor'), listDoctorServicePackages);

export default router;
