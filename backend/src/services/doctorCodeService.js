import Counter from '../models/central/Counter.js';
import Doctor from '../models/doctorModel.js';

export async function generateDoctorCode() {
  for (;;) {
    const counter = await Counter.findByIdAndUpdate(
      'doctorCode',
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const doctorCode = `DR${String(counter.sequence).padStart(4, '0')}`;
    const exists = await Doctor.exists({ doctorCode });
    if (!exists) return doctorCode;
  }
}

export async function syncDoctorCodeCounter() {
  const latestDoctor = await Doctor.findOne({ doctorCode: /^DR\d+$/ })
    .sort({ doctorCode: -1 })
    .select('doctorCode');
  const sequence = Number(latestDoctor?.doctorCode?.replace(/^DR/, '')) || 0;

  await Counter.findByIdAndUpdate(
    'doctorCode',
    { $max: { sequence } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
