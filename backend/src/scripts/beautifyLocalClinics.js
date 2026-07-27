import 'dotenv/config';
import mongoose from 'mongoose';
import Clinic from '../models/clinicModel.js';

const mongoUri = process.env.CENTRAL_MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clinic_central';

const clinicImages = [
  'https://cdn.phenikaamec.com/phenikaa-mec/image/5-14-2025/38e1d909-5654-4058-b72d-093375226581-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/5-15-2025/09f20d6c-5d67-4b7a-b852-63675cb10c68b-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/4-14-2025/7f9ddfee-3eb4-412b-8a12-735991616b8e-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-20-2025/15-158e1e64-e4f0-4763-8993-0db6e75dd6bf-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/1f9dedaa-f220-4797-b036-b047026f33a4-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/166-62ac563f-9306-4937-a7cd-99c83ee7e525-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/15-87f6166e-80c2-442e-89e1-e5bbdaea7c9-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/132-21794695-04f7-4f4e-9c8d-60815ee4e3e0-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/6-24-2025/ct-4ced2d3d-087e-4c6d-b804-137750c89c56-image.webp',
  'https://cdn.phenikaamec.com/phenikaa-mec/image/5-14-2025/38e1d909-5654-4058-b72d-093375226581-image.webp'
];

const clinicGalleries = [
  [clinicImages[0], clinicImages[3], clinicImages[8]],
  [clinicImages[1], clinicImages[4], clinicImages[6]],
  [clinicImages[2], clinicImages[5], clinicImages[7]],
  [clinicImages[3], clinicImages[8], clinicImages[0]],
  [clinicImages[4], clinicImages[6], clinicImages[1]],
  [clinicImages[5], clinicImages[7], clinicImages[2]],
  [clinicImages[6], clinicImages[1], clinicImages[4]],
  [clinicImages[7], clinicImages[2], clinicImages[5]],
  [clinicImages[8], clinicImages[0], clinicImages[3]],
  [clinicImages[0], clinicImages[8], clinicImages[6]]
];

const defaultWorkingHours = [
  { dayOfWeek: 'monday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'tuesday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'wednesday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'thursday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'friday', open: '08:00', close: '17:00' },
  { dayOfWeek: 'saturday', open: '08:00', close: '12:00' },
  { dayOfWeek: 'sunday', open: '08:00', close: '12:00', isClosed: true }
];

const clinicSeeds = [
  {
    clinicCode: 'HP',
    legacyCodes: ['HP'],
    legacyNames: ['Hai Phong Clinic'],
    name: 'Phòng khám Hải Phòng Care',
    address: '88 Lê Hồng Phong, Ngô Quyền, Hải Phòng',
    phone: '02253000004',
    email: 'haiphongcare@clinicbooking.vn',
    description: 'Cơ sở khám Nhi, Tai Mũi Họng và Da liễu tại Hải Phòng.'
  },
  {
    clinicCode: 'MT',
    legacyCodes: ['MT', 'BN'],
    legacyNames: ['Bac Ninh Clinic', 'Phòng khám Minh Tâm'],
    name: 'Phòng khám Từ Sơn',
    address: '25 Lý Thái Tổ, Bắc Ninh',
    phone: '02223000003',
    email: 'tuson@clinicbooking.vn',
    description: 'Cơ sở khám tổng quát và theo dõi bệnh mạn tính tại Bắc Ninh.'
  },
  {
    clinicCode: 'PK',
    legacyCodes: ['PK'],
    legacyNames: ['Phòng khám Phenikaa'],
    name: 'Phòng khám Phenikaa',
    address: 'Đường Nguyễn Trác, Yên Nghĩa, Hà Nội',
    phone: '02430000001',
    email: 'phenikaa@clinicbooking.vn',
    description: 'Cơ sở chính hỗ trợ đặt lịch, khám chuyên khoa và quản lý hồ sơ sức khỏe.'
  },
  {
    clinicCode: 'AK',
    legacyCodes: ['AK', 'HN'],
    legacyNames: ['Ha Noi Clinic'],
    name: 'Phòng khám An Khang Hà Nội',
    address: '12 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    phone: '02430000002',
    email: 'ankhang@clinicbooking.vn',
    description: 'Phòng khám đa khoa phục vụ bệnh nhân nội thành Hà Nội.'
  },
  {
    clinicCode: 'SH',
    legacyCodes: ['SH', 'HN2'],
    legacyNames: ['Phòng khám Phenikaa 2'],
    name: 'Phòng khám Sông Hàn',
    address: '02 Bạch Đằng, Hải Châu, Đà Nẵng',
    phone: '02363000005',
    email: 'songhan@clinicbooking.vn',
    description: 'Phòng khám miền Trung với lịch khám linh hoạt trong tuần.'
  },
  {
    clinicCode: 'SG',
    legacyCodes: ['SG'],
    legacyNames: [],
    name: 'Phòng khám Sài Gòn Plus',
    address: '99 Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh',
    phone: '02830000006',
    email: 'saigonplus@clinicbooking.vn',
    description: 'Cơ sở khám chuyên khoa và tư vấn sức khỏe tại TP. Hồ Chí Minh.'
  },
  {
    clinicCode: 'CL',
    legacyCodes: ['CL'],
    legacyNames: [],
    name: 'Phòng khám Cửu Long',
    address: '15 Hòa Bình, Ninh Kiều, Cần Thơ',
    phone: '02923000007',
    email: 'cuulong@clinicbooking.vn',
    description: 'Cơ sở miền Tây phục vụ khám tổng quát và tái khám định kỳ.'
  },
  {
    clinicCode: 'GH',
    legacyCodes: ['GH'],
    legacyNames: [],
    name: 'Phòng khám Green Health',
    address: '36 Nguyễn Văn Linh, Thanh Khê, Đà Nẵng',
    phone: '02363000008',
    email: 'greenhealth@clinicbooking.vn',
    description: 'Cơ sở tập trung chăm sóc sức khỏe gia đình và dự phòng.'
  },
  {
    clinicCode: 'TA',
    legacyCodes: ['TA'],
    legacyNames: [],
    name: 'Phòng khám Tâm An',
    address: '41 Nguyễn Huệ, Huế',
    phone: '02343000009',
    email: 'taman@clinicbooking.vn',
    description: 'Phòng khám thân thiện, hỗ trợ đặt lịch và theo dõi hồ sơ điện tử.'
  },
  {
    clinicCode: 'BM',
    legacyCodes: ['BM'],
    legacyNames: [],
    name: 'Phòng khám Bình Minh',
    address: '18 Quang Trung, Nha Trang, Khánh Hòa',
    phone: '02583000010',
    email: 'binhminh@clinicbooking.vn',
    description: 'Cơ sở khám ngoại trú dành cho bệnh nhân đặt lịch trước.'
  }
];

async function beautifyLocalClinics() {
  await mongoose.connect(mongoUri);

  let changedCount = 0;
  for (const [index, clinic] of clinicSeeds.entries()) {
    const lookup = {
      $or: [
        { clinicCode: { $in: clinic.legacyCodes } },
        { name: { $in: clinic.legacyNames } }
      ]
    };
    const result = await Clinic.findOneAndUpdate(
      lookup,
      {
        $set: {
          name: clinic.name,
          clinicCode: clinic.clinicCode,
          address: clinic.address,
          phone: clinic.phone,
          email: clinic.email,
          description: clinic.description,
          image: clinicImages[index],
          galleryImages: clinicGalleries[index],
          workingHours: defaultWorkingHours,
          displayOrder: index + 1,
          isActive: true
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (result) changedCount += 1;
  }

  const clinics = await Clinic.find({ clinicCode: { $in: clinicSeeds.map((clinic) => clinic.clinicCode) } })
    .select('clinicCode name image galleryImages displayOrder')
    .sort({ displayOrder: 1, clinicCode: 1 })
    .lean();

  console.log(`Synced ${changedCount} clinic records.`);
  console.table(clinics.map((clinic) => ({
    code: clinic.clinicCode,
    name: clinic.name,
    order: clinic.displayOrder,
    image: Boolean(clinic.image),
    gallery: clinic.galleryImages?.length || 0
  })));
}

beautifyLocalClinics()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
