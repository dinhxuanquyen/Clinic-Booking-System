import mongoose from 'mongoose';
import { connectCentralDb } from '../config/db.js';
import Clinic from '../models/clinicModel.js';
import Specialty from '../models/specialtyModel.js';

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SPECIALTY_SEEDS = [
  {
    name: 'Nhi khoa',
    aliases: ['nhi', 'nhi khoa', 'pediatrics'],
  },
  {
    name: 'Tháº§n kinh',
    aliases: ['than kinh', 'tháº§n kinh', 'neurology'],
    description: 'KhÃ¡m Ä‘au Ä‘áº§u, chÃ³ng máº·t, tÃª bÃ¬, rá»‘i loáº¡n giáº¥c ngá»§ vÃ  cÃ¡c triá»‡u chá»©ng tháº§n kinh thÆ°á»ng gáº·p.'
  },
  {
    name: 'HÃ´ háº¥p',
    aliases: ['ho hap', 'hÃ´ háº¥p', 'respiratory', 'pulmonology'],
    description: 'KhÃ¡m ho kÃ©o dÃ i, khÃ³ thá»Ÿ, khÃ² khÃ¨, hen pháº¿ quáº£n vÃ  cÃ¡c váº¥n Ä‘á» Ä‘Æ°á»ng hÃ´ háº¥p dÆ°á»›i.'
  },
  {
    name: 'Ná»™i tiáº¿t',
    aliases: ['noi tiet', 'ná»™i tiáº¿t', 'endocrinology'],
    description: 'TÆ° váº¥n Ä‘Ã¡i thÃ¡o Ä‘Æ°á»ng, rá»‘i loáº¡n tuyáº¿n giÃ¡p, rá»‘i loáº¡n chuyá»ƒn hÃ³a vÃ  theo dÃµi ná»™i tiáº¿t.'
  },
  {
    name: 'Tiáº¿t niá»‡u',
    aliases: ['tiet nieu', 'tiáº¿t niá»‡u', 'urology'],
    description: 'KhÃ¡m tiá»ƒu buá»‘t, tiá»ƒu ráº¯t, Ä‘au hÃ´ng lÆ°ng, sá»i tiáº¿t niá»‡u vÃ  cÃ¡c váº¥n Ä‘á» Ä‘Æ°á»ng tiá»ƒu.'
  },
  {
    name: 'TÃ¢m lÃ½ - Sá»©c khá»e tÃ¢m tháº§n',
    aliases: ['tam ly', 'tÃ¢m lÃ½', 'tam than', 'suc khoe tam than', 'mental health', 'psychiatry'],
    description: 'TÆ° váº¥n cÄƒng tháº³ng, máº¥t ngá»§, lo Ã¢u, tráº§m buá»“n vÃ  cÃ¡c váº¥n Ä‘á» sá»©c khá»e tinh tháº§n.'
  },
  {
    name: 'Phá»¥c há»“i chá»©c nÄƒng',
    aliases: ['phuc hoi chuc nang', 'phá»¥c há»“i chá»©c nÄƒng', 'rehabilitation', 'rehab'],
    description: 'TÆ° váº¥n phá»¥c há»“i váº­n Ä‘á»™ng sau cháº¥n thÆ°Æ¡ng, Ä‘au cÆ¡ xÆ°Æ¡ng khá»›p, tai biáº¿n hoáº·c pháº«u thuáº­t.'
  },
  {
    name: 'Dinh dÆ°á»¡ng',
    aliases: ['dinh duong', 'dinh dÆ°á»¡ng', 'nutrition'],
    description: 'TÆ° váº¥n dinh dÆ°á»¡ng cho tráº» em, ngÆ°á»i lá»›n, bá»‡nh máº¡n tÃ­nh, kiá»ƒm soÃ¡t cÃ¢n náº·ng vÃ  phá»¥c há»“i sá»©c khá»e.'
  },
  {
    name: 'Ung bÆ°á»›u',
    aliases: ['ung buou', 'ung bÆ°á»›u', 'oncology'],
    description: 'TÆ° váº¥n táº§m soÃ¡t, theo dÃµi khá»‘i u, báº¥t thÆ°á»ng háº¡ch vÃ  Ä‘á»‹nh hÆ°á»›ng khÃ¡m chuyÃªn sÃ¢u khi nghi ngá» ung bÆ°á»›u.'
  },
  {
    name: 'Tháº­n há»c',
    aliases: ['than hoc', 'tháº­n há»c', 'nephrology'],
    description: 'KhÃ¡m phÃ¹, tiá»ƒu báº¥t thÆ°á»ng, suy tháº­n, bá»‡nh tháº­n máº¡n vÃ  theo dÃµi chá»©c nÄƒng tháº­n.'
  }
];

const SPECIALTY_IMAGES = {
  [normalizeText('Nhi khoa')]: '/specialties/photos/specialty-pediatrics.jpg',
  [normalizeText('Tai MÅ©i Há»ng')]: '/specialties/photos/specialty-ent.jpg',
  [normalizeText('Da liá»…u')]: '/specialties/photos/specialty-dermatology.jpg',
  [normalizeText('Tim máº¡ch')]: '/specialties/photos/specialty-cardiology.jpg',
  [normalizeText('RÄƒng HÃ m Máº·t')]: '/specialties/photos/specialty-dental.jpg',
  [normalizeText('CÆ¡ xÆ°Æ¡ng khá»›p')]: '/specialties/photos/specialty-musculoskeletal.jpg',
  [normalizeText('Cháº¥n thÆ°Æ¡ng chá»‰nh hÃ¬nh')]: '/specialties/photos/specialty-orthopedics.jpg',
  [normalizeText('Ná»™i tá»•ng quÃ¡t')]: '/specialties/photos/specialty-internal.jpg',
  [normalizeText('TiÃªu hÃ³a')]: '/specialties/photos/specialty-gastroenterology.jpg',
  [normalizeText('Sáº£n phá»¥ khoa')]: '/specialties/photos/specialty-obgyn.jpg',
  [normalizeText('Máº¯t')]: '/specialties/photos/specialty-ophthalmology.jpg',
  [normalizeText('Tháº§n kinh')]: '/specialties/photos/specialty-neurology.jpg',
  [normalizeText('HÃ´ háº¥p')]: '/specialties/photos/specialty-respiratory.jpg',
  [normalizeText('Ná»™i tiáº¿t')]: '/specialties/photos/specialty-endocrinology.jpg',
  [normalizeText('Tiáº¿t niá»‡u')]: '/specialties/photos/specialty-urology.jpg',
  [normalizeText('TÃ¢m lÃ½ - Sá»©c khá»e tÃ¢m tháº§n')]: '/specialties/photos/specialty-mental-health.jpg',
  [normalizeText('Phá»¥c há»“i chá»©c nÄƒng')]: '/specialties/photos/specialty-rehabilitation.jpg',
  [normalizeText('Dinh dÆ°á»¡ng')]: '/specialties/photos/specialty-nutrition.jpg',
  [normalizeText('Ung bÆ°á»›u')]: '/specialties/photos/specialty-oncology.jpg',
  [normalizeText('Tháº­n há»c')]: '/specialties/photos/specialty-nephrology.jpg'
};

function hasEquivalentSpecialty(existingSpecialties, seed) {
  const aliasSet = new Set(seed.aliases.map(normalizeText));
  aliasSet.add(normalizeText(seed.name));
  return existingSpecialties.some((specialty) => aliasSet.has(normalizeText(specialty.name)));
}

async function seedSpecialties() {
  await connectCentralDb();

  const clinics = await Clinic.find({ isActive: { $ne: false } }).select('_id name').lean();
  if (!clinics.length) {
    console.log('No active clinics found. Please seed clinics before specialties.');
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const clinic of clinics) {
    const existingSpecialties = await Specialty.find({ clinicId: clinic._id }).select('_id name').lean();

    for (const seed of SPECIALTY_SEEDS) {
      if (hasEquivalentSpecialty(existingSpecialties, seed)) {
        skipped += 1;
        continue;
      }

      try {
        const specialty = await Specialty.create({
          name: seed.name,
          description: seed.description,
          image: SPECIALTY_IMAGES[normalizeText(seed.name)] || '',
          clinicId: clinic._id,
          isActive: true
        });
        await Clinic.updateOne({ _id: clinic._id }, { $addToSet: { specialtyIds: specialty._id } });
        existingSpecialties.push({ _id: specialty._id, name: specialty.name });
        created += 1;
      } catch (error) {
        failed += 1;
        console.warn(`Failed to create specialty "${seed.name}" for clinic "${clinic.name}":`, error.message);
      }
    }
  }

  const totalPackages = await Specialty.countDocuments();
  console.log('Specialty seed completed');
  console.log(`Clinics: ${clinics.length}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped existing: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total specialties: ${totalPackages}`);
}

seedSpecialties()
  .catch((error) => {
    console.error('Specialty seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
