import mongoose from 'mongoose';
import { connectCentralDb } from '../config/db.js';
import Clinic from '../models/clinicModel.js';
import Doctor from '../models/doctorModel.js';
import ServicePackage from '../models/servicePackageModel.js';
import Specialty from '../models/specialtyModel.js';
import { generateServicePackageCode } from '../services/servicePackageService.js';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function sameArray(left = [], right = []) {
  return JSON.stringify(left.filter(Boolean)) === JSON.stringify(right.filter(Boolean));
}

function samePackageData(servicePackage, data) {
  return (
    servicePackage.description === data.description &&
    Number(servicePackage.price) === Number(data.price) &&
    Number(servicePackage.durationMinutes) === Number(data.durationMinutes) &&
    sameArray(servicePackage.targetPatients, data.targetPatients) &&
    sameArray(servicePackage.includes, data.includes) &&
    servicePackage.isActive === true
  );
}

function specialtyKind(name) {
  const normalized = normalizeText(name);
  if (normalized.includes('nhi')) return 'pediatrics';
  if (normalized.includes('tai mui hong') || normalized.includes('tmh')) return 'ent';
  if (normalized.includes('da lieu')) return 'dermatology';
  if (normalized.includes('tim mach')) return 'cardiology';
  if (normalized.includes('rang') || normalized.includes('nha khoa')) return 'dental';
  if (normalized.includes('co xuong khop')) return 'musculoskeletal';
  if (normalized.includes('chan thuong') || normalized.includes('chinh hinh')) return 'trauma';
  if (normalized.includes('noi')) return 'internal';
  if (normalized.includes('tieu hoa')) return 'gastroenterology';
  return 'general';
}

const commonByKind = {
  pediatrics: {
    standardName: 'Khám nhi tiêu chuẩn',
    deepName: 'Khám chuyên sâu bệnh lý nhi',
    followUpName: 'Tái khám nhi',
    conditionName: 'Tư vấn hô hấp và dinh dưỡng trẻ em',
    standardTargets: ['Trẻ cần khám lần đầu', 'Trẻ sốt, ho, sổ mũi hoặc mệt mỏi', 'Phụ huynh cần định hướng chăm sóc'],
    deepTargets: ['Triệu chứng kéo dài hoặc tái phát', 'Cần trao đổi kỹ hơn với bác sĩ Nhi', 'Cần theo dõi tăng trưởng và bệnh lý nền'],
    conditionTargets: ['Trẻ ho kéo dài hoặc khò khè', 'Trẻ biếng ăn, chậm tăng cân', 'Phụ huynh cần kế hoạch chăm sóc tại nhà'],
    includes: ['Khám lâm sàng với bác sĩ Nhi', 'Đánh giá triệu chứng chính', 'Tư vấn chăm sóc và theo dõi tại nhà', 'Hẹn tái khám khi cần'],
    conditionIncludes: ['Đánh giá hô hấp và dinh dưỡng', 'Tư vấn dấu hiệu cần theo dõi', 'Gợi ý thói quen chăm sóc phù hợp', 'Định hướng xét nghiệm nếu cần']
  },
  ent: {
    standardName: 'Khám tai mũi họng tiêu chuẩn',
    deepName: 'Khám chuyên sâu tai mũi họng',
    followUpName: 'Tái khám tai mũi họng',
    conditionName: 'Tư vấn viêm họng, viêm amidan và viêm xoang',
    standardTargets: ['Đau họng, nghẹt mũi, sổ mũi', 'Ù tai, đau tai hoặc giảm nghe', 'Cần khám tai mũi họng ban đầu'],
    deepTargets: ['Triệu chứng kéo dài hoặc tái phát', 'Nghi viêm xoang hoặc viêm amidan', 'Cần tư vấn chuyên sâu trước điều trị'],
    conditionTargets: ['Đau họng kéo dài', 'Khàn tiếng hoặc ho kích ứng', 'Viêm xoang, viêm mũi dị ứng tái diễn'],
    includes: ['Khám tai mũi họng', 'Đánh giá triệu chứng và yếu tố nguy cơ', 'Tư vấn chăm sóc và phòng tái phát', 'Hẹn tái khám nếu cần'],
    conditionIncludes: ['Khám họng, mũi và tai', 'Đánh giá mức độ viêm', 'Tư vấn dấu hiệu cần đi khám sớm', 'Định hướng theo dõi sau khám']
  },
  dermatology: {
    standardName: 'Khám da liễu tiêu chuẩn',
    deepName: 'Khám chuyên sâu da liễu',
    followUpName: 'Tái khám da liễu',
    conditionName: 'Tư vấn mụn, dị ứng và viêm da',
    standardTargets: ['Ngứa, phát ban, nổi mẩn', 'Da khô, viêm da nhẹ', 'Cần tư vấn chăm sóc da'],
    deepTargets: ['Tổn thương da kéo dài', 'Dị ứng hoặc viêm da tái phát', 'Cần kế hoạch theo dõi cá nhân hóa'],
    conditionTargets: ['Mụn trứng cá', 'Mề đay, dị ứng, phát ban', 'Da kích ứng do mỹ phẩm hoặc môi trường'],
    includes: ['Khám da lâm sàng', 'Đánh giá yếu tố kích ứng', 'Tư vấn chăm sóc da', 'Hẹn tái khám nếu cần'],
    conditionIncludes: ['Đánh giá tình trạng da', 'Khai thác yếu tố khởi phát', 'Tư vấn chăm sóc và phòng tránh', 'Khuyến nghị xét nghiệm nếu cần']
  },
  cardiology: {
    standardName: 'Khám tim mạch tiêu chuẩn',
    deepName: 'Khám chuyên sâu tim mạch',
    followUpName: 'Tái khám tim mạch',
    conditionName: 'Tư vấn huyết áp và bệnh tim mạn tính',
    standardTargets: ['Hồi hộp, đau ngực nhẹ hoặc khó chịu vùng ngực', 'Người có nguy cơ tăng huyết áp', 'Cần kiểm tra sức khỏe tim mạch'],
    deepTargets: ['Có bệnh tim mạch đã theo dõi', 'Cần trao đổi kỹ về triệu chứng', 'Cần lập kế hoạch theo dõi dài hạn'],
    conditionTargets: ['Huyết áp dao động', 'Tim đập nhanh hoặc hồi hộp', 'Cần tư vấn lối sống tim mạch'],
    includes: ['Khám chuyên khoa tim mạch', 'Đánh giá yếu tố nguy cơ', 'Tư vấn theo dõi huyết áp', 'Khuyến nghị cận lâm sàng nếu cần'],
    conditionIncludes: ['Đánh giá chỉ số huyết áp', 'Tư vấn cách theo dõi tại nhà', 'Gợi ý thói quen sinh hoạt', 'Dặn dò dấu hiệu nguy hiểm']
  },
  dental: {
    standardName: 'Khám răng hàm mặt tiêu chuẩn',
    deepName: 'Khám chuyên sâu răng hàm mặt',
    followUpName: 'Tái khám răng hàm mặt',
    conditionName: 'Tư vấn sâu răng, ê buốt và viêm lợi',
    standardTargets: ['Đau răng hoặc ê buốt', 'Cần kiểm tra răng định kỳ', 'Nghi sâu răng hoặc viêm lợi'],
    deepTargets: ['Đau răng kéo dài', 'Nghi tổn thương răng/lợi phức tạp', 'Cần kế hoạch điều trị răng miệng'],
    conditionTargets: ['Sâu răng hoặc ê buốt khi ăn nhai', 'Chảy máu chân răng', 'Lợi sưng đỏ hoặc hôi miệng'],
    includes: ['Khám răng miệng tổng quát', 'Đánh giá răng và lợi', 'Tư vấn vệ sinh răng miệng', 'Khuyến nghị điều trị nếu cần'],
    conditionIncludes: ['Khám vùng răng đau', 'Đánh giá nguy cơ sâu răng/viêm lợi', 'Tư vấn hướng xử trí', 'Hẹn điều trị hoặc tái khám nếu cần']
  },
  musculoskeletal: {
    standardName: 'Khám cơ xương khớp tiêu chuẩn',
    deepName: 'Khám chuyên sâu cơ xương khớp',
    followUpName: 'Tái khám cơ xương khớp',
    conditionName: 'Tư vấn đau khớp, đau lưng và phục hồi vận động',
    standardTargets: ['Đau khớp hoặc đau lưng', 'Đau cơ sau vận động', 'Cần tư vấn vận động an toàn'],
    deepTargets: ['Đau kéo dài hoặc tái phát', 'Hạn chế vận động', 'Cần kế hoạch theo dõi phục hồi'],
    conditionTargets: ['Đau lưng, đau vai gáy', 'Đau gối, cổ tay, cổ chân', 'Sưng đau sau vận động'],
    includes: ['Khám vận động khớp', 'Đánh giá vùng đau', 'Tư vấn vận động an toàn', 'Khuyến nghị chụp chiếu nếu cần'],
    conditionIncludes: ['Đánh giá biên độ vận động', 'Tư vấn tư thế và sinh hoạt', 'Hướng dẫn theo dõi tại nhà', 'Hẹn tái kiểm tra khi cần']
  },
  trauma: {
    standardName: 'Khám chấn thương tiêu chuẩn',
    deepName: 'Khám chuyên sâu chấn thương chỉnh hình',
    followUpName: 'Tái khám chấn thương',
    conditionName: 'Tư vấn bong gân, trật khớp và chấn thương phần mềm',
    standardTargets: ['Sưng đau sau va chạm', 'Bầm tím hoặc đau phần mềm', 'Cần kiểm tra sau té ngã'],
    deepTargets: ['Hạn chế vận động sau chấn thương', 'Nghi bong gân hoặc trật khớp', 'Cần đánh giá kỹ sau tai nạn nhẹ'],
    conditionTargets: ['Ngã xe có sưng đau', 'Đau cổ tay, cổ chân sau xoắn vặn', 'Chấn thương thể thao nhẹ'],
    includes: ['Khám vùng chấn thương', 'Đánh giá mức độ sưng đau', 'Tư vấn theo dõi dấu hiệu nặng', 'Khuyến nghị chụp chiếu nếu cần'],
    conditionIncludes: ['Sàng lọc dấu hiệu nguy hiểm', 'Tư vấn cố định/chăm sóc phù hợp', 'Hướng dẫn vận động trở lại', 'Khuyến nghị cấp cứu nếu cần']
  },
  internal: {
    standardName: 'Khám nội tổng quát tiêu chuẩn',
    deepName: 'Khám chuyên sâu nội khoa',
    followUpName: 'Tái khám nội khoa',
    conditionName: 'Tư vấn sức khỏe tổng quát và bệnh lý thường gặp',
    standardTargets: ['Mệt mỏi, đau đầu, chóng mặt', 'Sốt nhẹ hoặc khó chịu toàn thân', 'Cần kiểm tra sức khỏe ban đầu'],
    deepTargets: ['Nhiều triệu chứng chưa rõ chuyên khoa', 'Cần tư vấn theo dõi dài hạn', 'Có bệnh nền cần trao đổi kỹ'],
    conditionTargets: ['Đau bụng, rối loạn tiêu hóa nhẹ', 'Mệt mỏi kéo dài', 'Cần tư vấn lối sống và phòng bệnh'],
    includes: ['Khám tổng quát', 'Đánh giá triệu chứng chính', 'Tư vấn hướng theo dõi', 'Khuyến nghị chuyên khoa nếu cần'],
    conditionIncludes: ['Đánh giá yếu tố nguy cơ', 'Tư vấn dinh dưỡng và vận động', 'Gợi ý kế hoạch kiểm tra định kỳ', 'Định hướng chuyên khoa phù hợp']
  },
  gastroenterology: {
    standardName: 'Khám tiêu hóa tiêu chuẩn',
    deepName: 'Khám chuyên sâu tiêu hóa',
    followUpName: 'Tái khám tiêu hóa',
    conditionName: 'Tư vấn đau bụng, tiêu chảy và buồn nôn',
    standardTargets: ['Đau bụng, đầy hơi, buồn nôn', 'Rối loạn tiêu hóa nhẹ', 'Cần khám tiêu hóa ban đầu'],
    deepTargets: ['Đau bụng kéo dài hoặc tái phát', 'Rối loạn tiêu hóa nhiều ngày', 'Cần kế hoạch theo dõi chuyên sâu'],
    conditionTargets: ['Tiêu chảy hoặc táo bón', 'Đầy bụng, khó tiêu', 'Buồn nôn, chán ăn'],
    includes: ['Khám chuyên khoa tiêu hóa', 'Đánh giá triệu chứng đường tiêu hóa', 'Tư vấn ăn uống và theo dõi', 'Khuyến nghị xét nghiệm nếu cần'],
    conditionIncludes: ['Khai thác triệu chứng và chế độ ăn', 'Tư vấn dấu hiệu cần đi khám sớm', 'Gợi ý chăm sóc tại nhà phù hợp', 'Hẹn tái khám khi cần']
  },
  general: {
    standardName: 'Khám chuyên khoa tiêu chuẩn',
    deepName: 'Khám chuyên sâu theo chuyên khoa',
    followUpName: 'Tái khám chuyên khoa',
    conditionName: 'Tư vấn bệnh lý thường gặp của chuyên khoa',
    standardTargets: ['Người bệnh cần khám lần đầu', 'Triệu chứng chưa rõ mức độ', 'Cần bác sĩ định hướng xử trí'],
    deepTargets: ['Triệu chứng kéo dài hoặc tái phát', 'Cần trao đổi kỹ với bác sĩ', 'Cần kế hoạch theo dõi cá nhân hóa'],
    conditionTargets: ['Triệu chứng thường gặp theo chuyên khoa', 'Cần tư vấn chăm sóc và theo dõi', 'Cần định hướng tái khám'],
    includes: ['Khám lâm sàng với bác sĩ chuyên khoa', 'Đánh giá triệu chứng chính', 'Tư vấn hướng theo dõi', 'Hẹn tái khám khi cần'],
    conditionIncludes: ['Khai thác triệu chứng', 'Đánh giá yếu tố nguy cơ', 'Tư vấn chăm sóc phù hợp', 'Khuyến nghị cận lâm sàng nếu cần']
  }
};

function buildCommonPackages(specialty) {
  const kind = commonByKind[specialtyKind(specialty.name)] || commonByKind.general;
  const specialtyName = specialty.name;

  return [
    {
      name: kind.standardName,
      price: 250000,
      durationMinutes: 30,
      description: `Gói khám tiêu chuẩn với bác sĩ chuyên khoa ${specialtyName}, phù hợp cho nhu cầu thăm khám ban đầu và được tư vấn hướng xử trí rõ ràng.`,
      targetPatients: kind.standardTargets,
      includes: kind.includes
    },
    {
      name: kind.deepName,
      price: 420000,
      durationMinutes: 40,
      description: `Gói khám chuyên sâu dành cho người bệnh cần trao đổi kỹ hơn về triệu chứng, yếu tố nguy cơ và kế hoạch theo dõi thuộc chuyên khoa ${specialtyName}.`,
      targetPatients: kind.deepTargets,
      includes: ['Khám chuyên sâu với bác sĩ', 'Đánh giá bệnh sử và triệu chứng chi tiết', 'Tư vấn kế hoạch theo dõi cá nhân hóa', 'Định hướng cận lâm sàng nếu cần']
    },
    {
      name: kind.followUpName,
      price: 150000,
      durationMinutes: 20,
      description: `Gói tái khám giúp bác sĩ đánh giá tiến triển sau lần khám trước và cập nhật hướng chăm sóc phù hợp.`,
      targetPatients: ['Đã khám trong thời gian gần đây', 'Cần đánh giá lại triệu chứng', 'Cần bác sĩ theo dõi tiến triển'],
      includes: ['Kiểm tra lại triệu chứng', 'Đánh giá đáp ứng sau tư vấn/điều trị', 'Cập nhật hướng chăm sóc tiếp theo']
    },
    {
      name: kind.conditionName,
      price: 320000,
      durationMinutes: 30,
      description: `Dịch vụ tư vấn theo nhóm bệnh lý thường gặp của chuyên khoa ${specialtyName}, giúp người bệnh hiểu rõ dấu hiệu cần theo dõi và thời điểm nên tái khám.`,
      targetPatients: kind.conditionTargets,
      includes: kind.conditionIncludes
    }
  ];
}

function buildDoctorPackage(doctor, specialty) {
  const degree = doctor.degree ? `${doctor.degree} ` : '';
  return {
    name: `Tư vấn chuyên sâu cùng ${degree}${doctor.name}`,
    price: 450000,
    durationMinutes: 40,
    description: `Gói tư vấn riêng với ${degree}${doctor.name}, phù hợp khi người bệnh cần trao đổi kỹ hơn về triệu chứng và kế hoạch theo dõi thuộc chuyên khoa ${specialty.name}.`,
    targetPatients: [
      'Người bệnh cần bác sĩ phụ trách tư vấn kỹ hơn',
      'Trường hợp có nhiều triệu chứng cần trao đổi thêm',
      'Người bệnh tái khám hoặc cần kế hoạch theo dõi cá nhân hóa'
    ],
    includes: [
      'Khám và tư vấn trực tiếp với bác sĩ',
      'Đánh giá hồ sơ hoặc triệu chứng hiện tại',
      'Tư vấn hướng theo dõi cá nhân hóa',
      'Hẹn tái khám khi cần'
    ]
  };
}

async function upsertPackage({ clinicId, specialtyId, doctorId = null, data }) {
  const filter = {
    clinicId,
    specialtyId,
    doctorId,
    name: data.name,
    isDeleted: false
  };

  let servicePackage = await ServicePackage.findOne(filter);
  if (!servicePackage) {
    servicePackage = new ServicePackage({
      ...filter,
      code: await generateServicePackageCode(),
      description: data.description,
      price: data.price,
      durationMinutes: data.durationMinutes,
      targetPatients: data.targetPatients,
      includes: data.includes,
      isActive: true
    });
    await servicePackage.save();
    return 'created';
  }

  if (samePackageData(servicePackage, data)) {
    return 'skipped';
  }

  servicePackage.description = data.description;
  servicePackage.price = data.price;
  servicePackage.durationMinutes = data.durationMinutes;
  servicePackage.targetPatients = data.targetPatients;
  servicePackage.includes = data.includes;
  servicePackage.isActive = true;
  await servicePackage.save();
  return 'updated';
}

function addResult(summary, result) {
  summary[result] += 1;
}

async function seedServicePackages() {
  await connectCentralDb();
  await ServicePackage.syncIndexes();

  const summary = { created: 0, updated: 0, skipped: 0 };
  const specialties = await Specialty.find({ isActive: { $ne: false } }).populate('clinicId').lean();

  for (const specialty of specialties) {
    const clinic = specialty.clinicId;
    if (!clinic || clinic.isActive === false) {
      summary.skipped += 1;
      continue;
    }

    for (const data of buildCommonPackages(specialty)) {
      addResult(summary, await upsertPackage({
        clinicId: clinic._id,
        specialtyId: specialty._id,
        doctorId: null,
        data
      }));
    }

    const doctors = await Doctor.find({
      clinicId: clinic._id,
      specialtyId: specialty._id,
      isActive: { $ne: false }
    }).lean();

    for (const doctor of doctors) {
      addResult(summary, await upsertPackage({
        clinicId: clinic._id,
        specialtyId: specialty._id,
        doctorId: doctor._id,
        data: buildDoctorPackage(doctor, specialty)
      }));
    }
  }

  const totalPackages = await ServicePackage.countDocuments({ isDeleted: false });
  console.log('Service package seed summary');
  console.log(`created: ${summary.created}`);
  console.log(`updated: ${summary.updated}`);
  console.log(`skipped: ${summary.skipped}`);
  console.log(`total packages: ${totalPackages}`);
}

seedServicePackages()
  .catch((error) => {
    console.error('Seed service packages failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
