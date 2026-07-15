import Service from '../models/central/Service.js';
import { getClinicConnection } from '../config/db.js';
import { getClinicModels } from '../models/clinic/models.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SLOT_HOLDING_APPOINTMENT_STATUSES } from '../constants/appointmentStatus.js';

export const listServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ isActive: true });
  res.json({ data: services });
});

export const listDoctors = asyncHandler(async (req, res) => {
  const connection = await getClinicConnection(req.query.clinicId);
  const { Doctor } = getClinicModels(connection);
  const filter = { clinicId: req.query.clinicId, isActive: true };
  if (req.query.specialtyId) filter.specialtyId = req.query.specialtyId;
  const doctors = await Doctor.find(filter);
  res.json({ data: doctors });
});

export const getDoctor = asyncHandler(async (req, res) => {
  const connection = await getClinicConnection(req.params.clinicId);
  const { Doctor, Schedule } = getClinicModels(connection);
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, clinicId: req.params.clinicId });
  const schedules = await Schedule.find({
    doctorId: req.params.doctorId,
    clinicId: req.params.clinicId,
    isActive: true
  }).sort({ date: 1 });

  res.json({ data: { doctor, schedules } });
});

export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { clinicId, doctorId, date } = req.query;
  const connection = await getClinicConnection(clinicId);
  const { Schedule, Appointment } = getClinicModels(connection);

  const schedule = await Schedule.findOne({ clinicId, doctorId, date, isActive: true });
  const booked = await Appointment.find({
    clinicId,
    doctorId,
    date,
    status: { $in: SLOT_HOLDING_APPOINTMENT_STATUSES }
  }).select('timeSlot');

  const bookedSlots = new Set(booked.map((item) => item.timeSlot));
  const slots = (schedule?.timeSlots || []).filter((slot) => !bookedSlots.has(slot));

  res.json({ data: slots });
});
