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
    description: 'Khám và tư vấn sức khỏe cho trẻ em, theo dõi tăng trưởng, tiêm chủng và các bệnh lý thường gặp ở trẻ.'
  },
  {
    name: 'Tai Mũi Họng',
    aliases: ['tai mui hong', 'tmh', 'ent'],
    description: 'Khám các vấn đề về tai, mũi, họng như viêm họng, viêm xoang, đau tai, nghẹt mũi và rối loạn thính lực.'
  },
  {
    name: 'Da liễu',
    aliases: ['da lieu', 'dermatology'],
    description: 'Khám mụn, viêm da, dị ứng, nấm da, rụng tóc và các vấn đề về da thường gặp.'
  },
  {
    name: 'Tim mạch',
    aliases: ['tim mach', 'cardiology'],
    description: 'Khám và theo dõi huyết áp, đau ngực, hồi hộp, rối loạn nhịp tim và các bệnh lý tim mạch.'
  },
  {
    name: 'Răng Hàm Mặt',
    aliases: ['rang ham mat', 'nha khoa', 'dental'],
    description: 'Khám răng miệng, đau răng, viêm lợi, sâu răng, tư vấn chăm sóc răng miệng và điều trị nha khoa cơ bản.'
  },
  {
    name: 'Cơ xương khớp',
    aliases: ['co xuong khop', 'musculoskeletal'],
    description: 'Khám đau khớp, đau lưng, đau vai gáy, cứng khớp và các vấn đề về cơ xương khớp.'
  },
  {
    name: 'Chấn thương chỉnh hình',
    aliases: ['chan thuong chinh hinh', 'orthopedics'],
    description: 'Khám chấn thương, bong gân, đau xương khớp sau vận động và theo dõi phục hồi sau chấn thương.'
  },
  {
    name: 'Nội tổng quát',
    aliases: ['noi tong quat', 'noi khoa', 'internal medicine'],
    description: 'Khám tổng quát, tư vấn các triệu chứng nội khoa thường gặp và định hướng chuyên khoa phù hợp.'
  },
  {
    name: 'Tiêu hóa',
    aliases: ['tieu hoa', 'gastroenterology'],
    description: 'Khám đau bụng, đầy hơi, rối loạn tiêu hóa, trào ngược, táo bón và các vấn đề đường tiêu hóa.'
  },
  {
    name: 'Sản phụ khoa',
    aliases: ['san phu khoa', 'phu khoa', 'obgyn'],
    description: 'Khám phụ khoa, theo dõi thai kỳ, tư vấn sức khỏe sinh sản và các vấn đề liên quan đến sản phụ khoa.'
  },
  {
    name: 'Mắt',
    aliases: ['mat', 'ophthalmology'],
    description: 'Khám nhìn mờ, đau mắt, khô mắt, đỏ mắt, chảy nước mắt và các vấn đề thị lực thường gặp.'
  },
  {
    name: 'Thần kinh',
    aliases: ['than kinh', 'neurology'],
    description: 'Khám đau đầu, chóng mặt, tê bì, rối loạn giấc ngủ và các triệu chứng thần kinh thường gặp.'
  },
  {
    name: 'Hô hấp',
    aliases: ['ho hap', 'respiratory', 'pulmonology'],
    description: 'Khám ho kéo dài, khó thở, khò khè, hen phế quản và các vấn đề đường hô hấp dưới.'
  },
  {
    name: 'Nội tiết',
    aliases: ['noi tiet', 'endocrinology'],
    description: 'Tư vấn đái tháo đường, rối loạn tuyến giáp, rối loạn chuyển hóa và theo dõi nội tiết.'
  },
  {
    name: 'Tiết niệu',
    aliases: ['tiet nieu', 'urology'],
    description: 'Khám tiểu buốt, tiểu rắt, đau hông lưng, sỏi tiết niệu và các vấn đề đường tiểu.'
  },
  {
    name: 'Tâm lý - Sức khỏe tâm thần',
    aliases: ['tam ly', 'tam than', 'suc khoe tam than', 'mental health', 'psychiatry'],
    description: 'Tư vấn căng thẳng, mất ngủ, lo âu, trầm buồn và các vấn đề sức khỏe tinh thần.'
  },
  {
    name: 'Phục hồi chức năng',
    aliases: ['phuc hoi chuc nang', 'rehabilitation', 'rehab'],
    description: 'Tư vấn phục hồi vận động sau chấn thương, đau cơ xương khớp, tai biến hoặc phẫu thuật.'
  },
  {
    name: 'Dinh dưỡng',
    aliases: ['dinh duong', 'nutrition'],
    description: 'Tư vấn dinh dưỡng cho trẻ em, người lớn, bệnh mạn tính, kiểm soát cân nặng và phục hồi sức khỏe.'
  },
  {
    name: 'Ung bướu',
    aliases: ['ung buou', 'oncology'],
    description: 'Tư vấn tầm soát, theo dõi khối u, bất thường hạch và định hướng khám chuyên sâu khi nghi ngờ ung bướu.'
  },
  {
    name: 'Thận học',
    aliases: ['than hoc', 'nephrology'],
    description: 'Khám phù, tiểu bất thường, suy thận, bệnh thận mạn và theo dõi chức năng thận.'
  }
];

const SPECIALTY_IMAGES = {
  [normalizeText('Nhi khoa')]: '/specialties/illustrations/specialty-pediatrics.svg',
  [normalizeText('Tai Mũi Họng')]: '/specialties/illustrations/specialty-ent.svg',
  [normalizeText('Da liễu')]: '/specialties/illustrations/specialty-dermatology.svg',
  [normalizeText('Tim mạch')]: '/specialties/illustrations/specialty-cardiology.svg',
  [normalizeText('Răng Hàm Mặt')]: '/specialties/illustrations/specialty-dental.svg',
  [normalizeText('Cơ xương khớp')]: '/specialties/illustrations/specialty-musculoskeletal.svg',
  [normalizeText('Chấn thương chỉnh hình')]: '/specialties/illustrations/specialty-orthopedics.svg',
  [normalizeText('Nội tổng quát')]: '/specialties/illustrations/specialty-internal.svg',
  [normalizeText('Tiêu hóa')]: '/specialties/illustrations/specialty-gastroenterology.svg',
  [normalizeText('Sản phụ khoa')]: '/specialties/illustrations/specialty-obgyn.svg',
  [normalizeText('Mắt')]: '/specialties/illustrations/specialty-ophthalmology.svg',
  [normalizeText('Thần kinh')]: '/specialties/illustrations/specialty-neurology.svg',
  [normalizeText('Hô hấp')]: '/specialties/illustrations/specialty-respiratory.svg',
  [normalizeText('Nội tiết')]: '/specialties/illustrations/specialty-endocrinology.svg',
  [normalizeText('Tiết niệu')]: '/specialties/illustrations/specialty-urology.svg',
  [normalizeText('Tâm lý - Sức khỏe tâm thần')]: '/specialties/illustrations/specialty-mental-health.svg',
  [normalizeText('Phục hồi chức năng')]: '/specialties/illustrations/specialty-rehabilitation.svg',
  [normalizeText('Dinh dưỡng')]: '/specialties/illustrations/specialty-nutrition.svg',
  [normalizeText('Ung bướu')]: '/specialties/illustrations/specialty-oncology.svg',
  [normalizeText('Thận học')]: '/specialties/illustrations/specialty-nephrology.svg'
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
