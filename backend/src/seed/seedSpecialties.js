import mongoose from 'mongoose';
import { connectCentralDb } from '../config/db.js';
import Clinic from '../models/clinicModel.js';
import Specialty from '../models/specialtyModel.js';

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
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
    description: 'Khám và tư vấn sức khỏe trẻ em, theo dõi tăng trưởng, sốt, ho, tiêu hóa và các vấn đề thường gặp ở trẻ.'
  },
  {
    name: 'Tai Mũi Họng',
    aliases: ['tai mui hong', 'tai mũi họng', 'tmh', 'ent'],
    description: 'Khám đau họng, nghẹt mũi, ho kéo dài, viêm xoang, ù tai, đau tai và các bệnh lý tai mũi họng thường gặp.'
  },
  {
    name: 'Da liễu',
    aliases: ['da lieu', 'da liễu', 'dermatology'],
    description: 'Khám mụn, dị ứng, phát ban, ngứa, viêm da và tư vấn chăm sóc da an toàn.'
  },
  {
    name: 'Tim mạch',
    aliases: ['tim mach', 'tim mạch', 'cardiology'],
    description: 'Khám đau ngực, hồi hộp, khó thở, tăng huyết áp và theo dõi các yếu tố nguy cơ tim mạch.'
  },
  {
    name: 'Răng Hàm Mặt',
    aliases: ['rang ham mat', 'răng hàm mặt', 'nha khoa', 'dental'],
    description: 'Khám đau răng, sâu răng, ê buốt, viêm lợi và tư vấn chăm sóc răng miệng.'
  },
  {
    name: 'Cơ xương khớp',
    aliases: ['co xuong khop', 'cơ xương khớp', 'musculoskeletal'],
    description: 'Khám đau khớp, đau lưng, đau cổ vai gáy, hạn chế vận động và các vấn đề cơ xương khớp thường gặp.'
  },
  {
    name: 'Chấn thương chỉnh hình',
    aliases: ['chan thuong chinh hinh', 'chấn thương chỉnh hình', 'chan thuong', 'orthopedics', 'trauma'],
    description: 'Khám sau ngã xe, bong gân, trật khớp, đau sau va đập và chấn thương phần mềm.'
  },
  {
    name: 'Nội tổng quát',
    aliases: ['noi tong quat', 'nội tổng quát', 'noi khoa', 'internal medicine'],
    description: 'Khám các triệu chứng toàn thân, mệt mỏi, sốt, đau bụng, rối loạn tiêu hóa và tư vấn sức khỏe tổng quát.'
  },
  {
    name: 'Tiêu hóa',
    aliases: ['tieu hoa', 'tiêu hóa', 'gastroenterology'],
    description: 'Khám đau bụng, đầy hơi, tiêu chảy, táo bón, buồn nôn và các rối loạn tiêu hóa thường gặp.'
  },
  {
    name: 'Sản phụ khoa',
    aliases: ['san phu khoa', 'sản phụ khoa', 'phu khoa', 'obstetrics gynecology'],
    description: 'Tư vấn sức khỏe phụ nữ, rối loạn kinh nguyệt, viêm nhiễm phụ khoa và theo dõi thai kỳ cơ bản.'
  },
  {
    name: 'Mắt',
    aliases: ['mat', 'mắt', 'ophthalmology'],
    description: 'Khám nhìn mờ, đau mắt, đỏ mắt, khô mắt và tư vấn chăm sóc thị lực.'
  },
  {
    name: 'Thần kinh',
    aliases: ['than kinh', 'thần kinh', 'neurology'],
    description: 'Khám đau đầu, chóng mặt, tê bì, rối loạn giấc ngủ và các triệu chứng thần kinh thường gặp.'
  },
  {
    name: 'Hô hấp',
    aliases: ['ho hap', 'hô hấp', 'respiratory', 'pulmonology'],
    description: 'Khám ho kéo dài, khó thở, khò khè, hen phế quản và các vấn đề đường hô hấp dưới.'
  },
  {
    name: 'Nội tiết',
    aliases: ['noi tiet', 'nội tiết', 'endocrinology'],
    description: 'Tư vấn đái tháo đường, rối loạn tuyến giáp, rối loạn chuyển hóa và theo dõi nội tiết.'
  },
  {
    name: 'Tiết niệu',
    aliases: ['tiet nieu', 'tiết niệu', 'urology'],
    description: 'Khám tiểu buốt, tiểu rắt, đau hông lưng, sỏi tiết niệu và các vấn đề đường tiểu.'
  },
  {
    name: 'Tâm lý - Sức khỏe tâm thần',
    aliases: ['tam ly', 'tâm lý', 'tam than', 'suc khoe tam than', 'mental health', 'psychiatry'],
    description: 'Tư vấn căng thẳng, mất ngủ, lo âu, trầm buồn và các vấn đề sức khỏe tinh thần.'
  },
  {
    name: 'Phục hồi chức năng',
    aliases: ['phuc hoi chuc nang', 'phục hồi chức năng', 'rehabilitation', 'rehab'],
    description: 'Tư vấn phục hồi vận động sau chấn thương, đau cơ xương khớp, tai biến hoặc phẫu thuật.'
  },
  {
    name: 'Dinh dưỡng',
    aliases: ['dinh duong', 'dinh dưỡng', 'nutrition'],
    description: 'Tư vấn dinh dưỡng cho trẻ em, người lớn, bệnh mạn tính, kiểm soát cân nặng và phục hồi sức khỏe.'
  },
  {
    name: 'Ung bướu',
    aliases: ['ung buou', 'ung bướu', 'oncology'],
    description: 'Tư vấn tầm soát, theo dõi khối u, bất thường hạch và định hướng khám chuyên sâu khi nghi ngờ ung bướu.'
  },
  {
    name: 'Thận học',
    aliases: ['than hoc', 'thận học', 'nephrology'],
    description: 'Khám phù, tiểu bất thường, suy thận, bệnh thận mạn và theo dõi chức năng thận.'
  }
];

const SPECIALTY_IMAGES = {
  [normalizeText('Nhi khoa')]: '/specialties/photos/pediatrics-care.jpg',
  [normalizeText('Tai Mũi Họng')]: '/specialties/photos/medical-general.png',
  [normalizeText('Da liễu')]: '/specialties/photos/doctor-female.jpg',
  [normalizeText('Tim mạch')]: '/specialties/photos/medical-general.png',
  [normalizeText('Răng Hàm Mặt')]: '/specialties/photos/dental-clinic.jpg',
  [normalizeText('Cơ xương khớp')]: '/specialties/photos/orthopedics-xray.jpg',
  [normalizeText('Chấn thương chỉnh hình')]: '/specialties/photos/orthopedics-xray.jpg',
  [normalizeText('Nội tổng quát')]: '/specialties/photos/medical-general.png',
  [normalizeText('Tiêu hóa')]: '/specialties/photos/medical-general.png',
  [normalizeText('Sản phụ khoa')]: '/specialties/photos/doctor-female.jpg',
  [normalizeText('Mắt')]: '/specialties/photos/doctor-female.jpg',
  [normalizeText('Thần kinh')]: '/specialties/photos/hospital-building.jpg',
  [normalizeText('Hô hấp')]: '/specialties/photos/orthopedics-xray.jpg',
  [normalizeText('Nội tiết')]: '/specialties/photos/medical-general.png',
  [normalizeText('Tiết niệu')]: '/specialties/photos/hospital-campus.jpg',
  [normalizeText('Tâm lý - Sức khỏe tâm thần')]: '/specialties/photos/doctor-female.jpg',
  [normalizeText('Phục hồi chức năng')]: '/specialties/photos/orthopedics-xray.jpg',
  [normalizeText('Dinh dưỡng')]: '/specialties/photos/medical-general.png',
  [normalizeText('Ung bướu')]: '/specialties/photos/hospital-building.jpg',
  [normalizeText('Thận học')]: '/specialties/photos/hospital-campus.jpg'
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
