import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Article from '../models/articleModel.js';
import User from '../models/central/User.js';

const publishedAt = new Date('2026-07-28T08:00:00+07:00');

const articles = [
  {
    title: 'Chuẩn bị trước khi đi khám chuyên khoa',
    slug: 'chuan-bi-truoc-khi-di-kham-chuyen-khoa',
    summary: 'Các thông tin nên chuẩn bị để buổi khám diễn ra nhanh và hiệu quả.',
    coverImage: '/articles-health-banner.webp',
    category: 'Hướng dẫn khám bệnh',
    tags: ['khám chuyên khoa', 'chuẩn bị đi khám', 'hồ sơ sức khỏe'],
    content: [
      'Trước khi đi khám chuyên khoa, người bệnh nên chuẩn bị trước các thông tin liên quan đến tình trạng sức khỏe hiện tại. Việc chuẩn bị đầy đủ giúp buổi khám diễn ra nhanh hơn, bác sĩ dễ nắm bắt vấn đề và đưa ra hướng tư vấn phù hợp.',
      'Người bệnh nên mang theo giấy tờ cá nhân, kết quả khám cũ, đơn thuốc đang sử dụng, danh sách bệnh nền hoặc tiền sử dị ứng nếu có. Khi mô tả triệu chứng, nên ghi nhớ thời điểm xuất hiện, mức độ khó chịu, yếu tố làm tăng hoặc giảm triệu chứng và các dấu hiệu đi kèm.',
      'Bên cạnh đó, người bệnh nên đặt lịch trước, đến đúng giờ hẹn và chuẩn bị sẵn các câu hỏi cần trao đổi với bác sĩ. Điều này giúp quá trình thăm khám rõ ràng hơn và hạn chế bỏ sót thông tin quan trọng.'
    ].join('\n\n')
  },
  {
    title: 'Khi nào nên dùng tư vấn triệu chứng AI?',
    slug: 'khi-nao-nen-dung-tu-van-trieu-chung-ai',
    summary: 'AI giúp định hướng ban đầu nhưng không thay thế thăm khám với bác sĩ.',
    coverImage: '/symptom-checker-banner.webp',
    category: 'Tư vấn sức khỏe',
    tags: ['tư vấn triệu chứng', 'AI', 'gợi ý chuyên khoa'],
    content: [
      'Tư vấn triệu chứng bằng AI là chức năng hỗ trợ người dùng mô tả tình trạng sức khỏe và nhận gợi ý ban đầu về chuyên khoa phù hợp. Chức năng này hữu ích khi người bệnh chưa xác định rõ nên khám chuyên khoa nào hoặc cần định hướng trước khi đặt lịch.',
      'Người dùng có thể nhập các triệu chứng đang gặp phải như đau đầu, ho, sốt, đau bụng, đau khớp hoặc các biểu hiện bất thường khác. Hệ thống sẽ phân tích nội dung và đưa ra gợi ý tham khảo về chuyên khoa, mức độ cần đi khám và một số lưu ý ban đầu.',
      'Kết quả tư vấn từ AI chỉ mang tính chất hỗ trợ, không thay thế cho chẩn đoán của bác sĩ. Nếu người bệnh có triệu chứng nặng, kéo dài hoặc xuất hiện dấu hiệu nguy hiểm, cần đến cơ sở y tế để được thăm khám trực tiếp.'
    ].join('\n\n')
  },
  {
    title: 'Cách chọn gói khám phù hợp',
    slug: 'cach-chon-goi-kham-phu-hop',
    summary: 'Chọn gói khám theo nhu cầu, độ tuổi, chuyên khoa và cơ sở thuận tiện.',
    coverImage: '/packages-family-banner.webp',
    category: 'Gói khám',
    tags: ['gói khám', 'khám tổng quát', 'chăm sóc sức khỏe'],
    content: [
      'Việc lựa chọn gói khám phù hợp giúp người bệnh tiết kiệm thời gian, chi phí và nhận được dịch vụ đúng với nhu cầu sức khỏe của mình. Mỗi gói khám thường được thiết kế cho một nhóm mục tiêu khác nhau như khám tổng quát, theo dõi bệnh mạn tính hoặc thăm khám theo chuyên khoa.',
      'Người bệnh nên cân nhắc các yếu tố như độ tuổi, giới tính, tiền sử bệnh, triệu chứng hiện tại, chuyên khoa cần khám và vị trí cơ sở y tế. Nếu chỉ cần kiểm tra định kỳ, gói khám tổng quát là lựa chọn phù hợp. Nếu đã có triệu chứng cụ thể, người bệnh nên ưu tiên gói khám theo chuyên khoa.',
      'Trước khi đặt lịch, người bệnh nên xem kỹ nội dung dịch vụ, thời lượng khám, bác sĩ phụ trách và cơ sở thực hiện. Việc chọn đúng gói khám giúp quá trình thăm khám thuận tiện hơn và hỗ trợ bác sĩ đánh giá tình trạng sức khỏe chính xác hơn.'
    ].join('\n\n')
  }
];

async function findAuthor() {
  const admin = await User.findOne({ role: 'admin', isActive: { $ne: false } }).sort({ createdAt: 1 });
  if (admin) return admin;

  const fallbackUser = await User.findOne({ isActive: { $ne: false } }).sort({ createdAt: 1 });
  if (fallbackUser) return fallbackUser;

  throw new Error('Không tìm thấy tài khoản người dùng để gán tác giả bài viết.');
}

async function restoreFeaturedArticles() {
  await connectDatabase();
  const author = await findAuthor();

  let created = 0;
  let restored = 0;
  let skipped = 0;

  for (const article of articles) {
    const existing = await Article.findOne({ slug: article.slug });

    if (existing && !existing.isDeleted) {
      skipped += 1;
      console.log(`[skip] ${article.title}`);
      continue;
    }

    if (existing) {
      existing.set({
        ...article,
        authorId: existing.authorId || author._id,
        authorRole: existing.authorRole || 'admin',
        status: 'published',
        isFeatured: true,
        isDeleted: false,
        publishedAt: existing.publishedAt || publishedAt
      });
      await existing.save();
      restored += 1;
      console.log(`[restore] ${article.title}`);
      continue;
    }

    await Article.create({
      ...article,
      authorId: author._id,
      authorRole: 'admin',
      status: 'published',
      isFeatured: true,
      isDeleted: false,
      publishedAt
    });
    created += 1;
    console.log(`[create] ${article.title}`);
  }

  console.log(`Done. Created: ${created}, restored: ${restored}, skipped: ${skipped}.`);
}

restoreFeaturedArticles()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
