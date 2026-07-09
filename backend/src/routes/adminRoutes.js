import express from 'express';
import {
  clinicRules,
  auditLogIdParamRule,
  createClinic,
  createDoctor,
  createDoctorAccount,
  createService,
  createSpecialty,
  dashboard,
  doctorAccountParamRule,
  doctorRules,
  createDoctorAccountRules,
  getDoctorDetail,
  getAuditLogDetail,
  idParamRule,
  linkDoctorAccount,
  linkDoctorAccountRules,
  listDoctorUsers,
  listAuditLogs,
  listUsers,
  resetDoctorPassword,
  resetDoctorPasswordRules,
  scheduleRules,
  serviceRules,
  specialtyRules,
  updateClinic,
  updateDoctorAccountStatus,
  updateDoctorAccountStatusRules,
  updateDoctor,
  updateService,
  updateSpecialty,
  upsertSchedule
} from '../controllers/adminController.js';
import { auth } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(auth, roleMiddleware('admin'));

router.get('/dashboard', dashboard);
router.get('/users', listUsers);
router.get('/doctor-users', listDoctorUsers);
router.get('/audit-logs', listAuditLogs);
router.get('/audit-logs/:id', auditLogIdParamRule, validate, getAuditLogDetail);
router.post('/clinics', clinicRules, validate, createClinic);
router.patch('/clinics/:id', idParamRule, validate, updateClinic);
router.post('/specialties', specialtyRules, validate, createSpecialty);
router.patch('/specialties/:id', idParamRule, validate, updateSpecialty);
router.post('/services', serviceRules, validate, createService);
router.patch('/services/:id', idParamRule, validate, updateService);
router.post('/doctors', doctorRules, validate, createDoctor);
router.patch('/doctors/:id', doctorRules, validate, updateDoctor);
router.get('/doctors/:doctorId/detail', doctorAccountParamRule, validate, getDoctorDetail);
router.post('/doctors/:doctorId/account', createDoctorAccountRules, validate, createDoctorAccount);
router.patch('/doctors/:doctorId/account', linkDoctorAccountRules, validate, linkDoctorAccount);
router.patch('/doctors/:doctorId/account/reset-password', resetDoctorPasswordRules, validate, resetDoctorPassword);
router.patch('/doctors/:doctorId/account/status', updateDoctorAccountStatusRules, validate, updateDoctorAccountStatus);
router.post('/schedules', scheduleRules, validate, upsertSchedule);

export default router;
