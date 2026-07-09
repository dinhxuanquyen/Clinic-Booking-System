import mongoose from 'mongoose';
import { connectCentralDb } from '../config/db.js';
import Article from '../models/articleModel.js';
import Specialty from '../models/specialtyModel.js';
import User from '../models/central/User.js';

const disclaimer = 'Thông tin trong bài viết chỉ mang tính tham khảo, không thay thế cho việc thăm khám, chẩn đoán hoặc điều trị trực tiếp với bác sĩ.';

const covers = {
  general: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80',
  pediatric: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=1200&q=80',
  ent: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80',
  cardio: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=1200&q=80',
  bone: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80'
};

function toSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function articleContent(sections) {
  const content = sections
    .map((section) => {
      const lines = [`## ${section.heading}`, ...section.paragraphs];
      if (section.bullets?.length) {
        lines.push('', ...section.bullets.map((item) => `- ${item}`));
      }
      return lines.join('\n\n');
    })
    .join('\n\n');

  return `${content}\n\n---\n\n${disclaimer}`;
}

function matchSpecialty(name, specialties) {
  if (!name) return null;
  const normalized = toSlug(name);
  return specialties.find((item) => {
    const specialtySlug = toSlug(item.name);
    return specialtySlug.includes(normalized) || normalized.includes(specialtySlug);
  });
}

const articleSeeds = [
  {
    title: 'Hướng dẫn chuẩn bị trước khi đi khám để buổi khám hiệu quả hơn',
    category: 'Hướng dẫn khám bệnh',
    summary: 'Những giấy tờ, thông tin sức khỏe và lưu ý quan trọng giúp người bệnh tiết kiệm thời gian, trao đổi với bác sĩ rõ ràng hơn và tránh bỏ sót triệu chứng.',
    tags: ['chuẩn bị đi khám', 'hướng dẫn khám bệnh', 'hồ sơ y tế', 'đặt lịch khám'],
    isFeatured: true,
    specialty: '',
    coverImage: covers.general,
    sections: [
      {
        heading: 'Vì sao cần chuẩn bị trước khi đi khám?',
        paragraphs: [
          'Một buổi khám hiệu quả không chỉ phụ thuộc vào bác sĩ mà còn phụ thuộc vào việc người bệnh cung cấp thông tin đầy đủ, đúng trọng tâm. Nhiều trường hợp khi vào phòng khám mới nhớ ra mình quên kết quả xét nghiệm cũ, tên thuốc đang dùng hoặc thời điểm triệu chứng bắt đầu.',
          'Chuẩn bị trước giúp bác sĩ hiểu nhanh bối cảnh sức khỏe, đánh giá nguy cơ chính xác hơn và đưa ra hướng theo dõi phù hợp. Điều này đặc biệt quan trọng với người có bệnh mạn tính, người cao tuổi, trẻ em hoặc người đang dùng nhiều loại thuốc.'
        ]
      },
      {
        heading: 'Các giấy tờ nên mang theo',
        paragraphs: [
          'Người bệnh nên chuẩn bị giấy tờ tùy thân, thông tin đặt lịch, sổ khám hoặc kết quả khám trước đó nếu có. Nếu từng làm xét nghiệm, siêu âm, X-quang, nội soi hoặc chụp MRI/CT, hãy mang bản giấy hoặc file ảnh để bác sĩ đối chiếu.',
          'Với trẻ em, người nhà nên mang sổ tiêm chủng, đơn thuốc cũ và ghi chú về cân nặng gần nhất. Với người có bệnh nền, cần chuẩn bị danh sách thuốc đang dùng, liều dùng và thời gian sử dụng.'
        ],
        bullets: [
          'Căn cước công dân hoặc giấy tờ định danh.',
          'Mã lịch hẹn hoặc thông tin đặt lịch trên hệ thống.',
          'Đơn thuốc, kết quả xét nghiệm, phim chụp hoặc hồ sơ điều trị cũ.',
          'Danh sách thuốc đang sử dụng, bao gồm thực phẩm chức năng nếu có.',
          'Thông tin dị ứng thuốc, dị ứng thức ăn hoặc phản ứng bất thường từng gặp.'
        ]
      },
      {
        heading: 'Cách mô tả triệu chứng để bác sĩ dễ đánh giá',
        paragraphs: [
          'Thay vì chỉ nói “tôi bị đau” hoặc “tôi thấy mệt”, người bệnh nên mô tả theo thời gian, vị trí, mức độ và yếu tố liên quan. Ví dụ: đau họng 3 ngày, sốt nhẹ buổi tối, ho khan, đã uống thuốc hạ sốt một lần.',
          'Nếu triệu chứng xuất hiện từng đợt, hãy ghi lại thời điểm hay xảy ra nhất. Nếu triệu chứng tăng khi vận động, ăn uống, nằm xuống hoặc tiếp xúc với dị nguyên, thông tin này rất hữu ích cho quá trình khám.'
        ],
        bullets: [
          'Triệu chứng bắt đầu từ khi nào?',
          'Vị trí đau hoặc khó chịu ở đâu?',
          'Mức độ nhẹ, vừa hay nặng?',
          'Có sốt, nôn, tiêu chảy, khó thở, phát ban hoặc sụt cân không?',
          'Đã dùng thuốc gì và đáp ứng ra sao?'
        ]
      },
      {
        heading: 'Những việc nên làm trong ngày đi khám',
        paragraphs: [
          'Bạn nên đến trước giờ hẹn 10-15 phút để hoàn tất thủ tục. Nếu cần xét nghiệm máu hoặc siêu âm bụng, một số trường hợp có thể cần nhịn ăn theo hướng dẫn của cơ sở y tế.',
          'Khi trao đổi với bác sĩ, hãy nói rõ điều mình lo lắng nhất. Nếu không hiểu hướng dẫn dùng thuốc hoặc lịch tái khám, hãy hỏi lại ngay để tránh nhầm lẫn khi về nhà.'
        ]
      },
      {
        heading: 'Khi nào cần đi cấp cứu thay vì chờ lịch khám?',
        paragraphs: [
          'Đặt lịch khám phù hợp với các vấn đề không quá khẩn cấp. Nếu xuất hiện dấu hiệu nguy hiểm, người bệnh cần đến cơ sở cấp cứu gần nhất thay vì chờ đến giờ hẹn.'
        ],
        bullets: [
          'Đau ngực dữ dội, khó thở, tím tái.',
          'Yếu liệt tay chân, méo miệng, nói khó đột ngột.',
          'Chảy máu nhiều, ngất, co giật.',
          'Đau bụng dữ dội kèm sốt cao hoặc nôn liên tục.',
          'Trẻ nhỏ li bì, bỏ bú, thở nhanh hoặc co giật.'
        ]
      }
    ]
  },
  {
    title: 'Trẻ bị sốt: theo dõi tại nhà thế nào và khi nào cần đi khám?',
    category: 'Nhi khoa',
    summary: 'Hướng dẫn phụ huynh theo dõi trẻ bị sốt, nhận biết dấu hiệu nguy hiểm và chuẩn bị thông tin cần thiết trước khi đưa trẻ đi khám Nhi khoa.',
    tags: ['nhi khoa', 'trẻ bị sốt', 'chăm sóc trẻ', 'dấu hiệu nguy hiểm'],
    isFeatured: true,
    specialty: 'Nhi khoa',
    coverImage: covers.pediatric,
    sections: [
      {
        heading: 'Sốt ở trẻ em có phải luôn nguy hiểm?',
        paragraphs: [
          'Sốt là phản ứng thường gặp khi cơ thể trẻ đáp ứng với nhiễm virus, vi khuẩn, sau tiêm chủng hoặc một số tình trạng viêm. Bản thân sốt không phải lúc nào cũng nguy hiểm, nhưng cần được theo dõi đúng cách vì trẻ nhỏ có thể diễn biến nhanh hơn người lớn.',
          'Điều quan trọng là đánh giá toàn trạng của trẻ: trẻ có tỉnh táo không, có uống được không, có khó thở không, có phát ban bất thường không. Không nên chỉ nhìn vào con số nhiệt độ để quyết định mức độ nặng.'
        ]
      },
      {
        heading: 'Cách theo dõi trẻ bị sốt tại nhà',
        paragraphs: [
          'Phụ huynh nên đo nhiệt độ bằng nhiệt kế, ghi lại thời điểm sốt và mức nhiệt cao nhất trong ngày. Cho trẻ uống đủ nước, mặc đồ thoáng và theo dõi số lần đi tiểu. Không nên chườm lạnh quá mức hoặc tự ý phối hợp nhiều thuốc hạ sốt.',
          'Nếu trẻ vẫn chơi, uống được, không khó thở và sốt mới xuất hiện trong thời gian ngắn, phụ huynh có thể theo dõi sát. Tuy nhiên, với trẻ nhỏ dưới 3 tháng tuổi, cần thận trọng hơn và nên đưa trẻ đi khám sớm khi có sốt.'
        ],
        bullets: [
          'Đo nhiệt độ mỗi 4-6 giờ hoặc khi trẻ nóng nhiều.',
          'Theo dõi ăn uống, giấc ngủ, mức độ tỉnh táo và số lần đi tiểu.',
          'Ghi lại thuốc đã dùng, liều lượng và thời điểm dùng.',
          'Không tự dùng kháng sinh khi chưa có chỉ định.',
          'Không cạo gió, đắp lá hoặc dùng mẹo dân gian gây kích ứng da trẻ.'
        ]
      },
      {
        heading: 'Dấu hiệu cần đưa trẻ đi khám sớm',
        paragraphs: [
          'Một số dấu hiệu cho thấy trẻ cần được bác sĩ đánh giá trực tiếp. Đặc biệt, nếu trẻ có biểu hiện li bì, thở bất thường hoặc co giật, phụ huynh không nên chờ theo dõi thêm tại nhà.'
        ],
        bullets: [
          'Trẻ dưới 3 tháng tuổi có sốt.',
          'Sốt cao khó hạ hoặc sốt kéo dài trên 48-72 giờ.',
          'Li bì, khó đánh thức, bỏ bú hoặc không uống được.',
          'Thở nhanh, rút lõm ngực, tím môi.',
          'Co giật, phát ban xuất huyết, nôn nhiều hoặc tiêu chảy mất nước.',
          'Đau tai, đau họng nhiều, đau bụng hoặc tiểu buốt.'
        ]
      },
      {
        heading: 'Cần chuẩn bị gì khi đưa trẻ đi khám?',
        paragraphs: [
          'Bác sĩ sẽ cần biết trẻ sốt từ khi nào, nhiệt độ cao nhất, thuốc đã dùng và các triệu chứng đi kèm. Nếu trẻ từng dị ứng thuốc, có bệnh nền hoặc sinh non, phụ huynh nên thông báo ngay từ đầu.',
          'Mang theo sổ tiêm chủng, đơn thuốc cũ và kết quả xét nghiệm trước đó nếu có. Những thông tin này giúp bác sĩ tránh lặp lại thuốc không phù hợp và đánh giá chính xác hơn.'
        ]
      },
      {
        heading: 'Sau khi khám cần theo dõi gì?',
        paragraphs: [
          'Sau khi được bác sĩ hướng dẫn, phụ huynh cần cho trẻ dùng thuốc đúng liều, đúng thời gian và theo dõi đáp ứng. Nếu trẻ nặng hơn, sốt kéo dài hoặc xuất hiện dấu hiệu mới, cần tái khám sớm hơn lịch hẹn.',
          'Không nên tự ngưng thuốc hoặc dùng lại đơn cũ cho lần bệnh sau, vì nguyên nhân sốt có thể khác nhau ở mỗi đợt.'
        ]
      }
    ]
  },
  {
    title: 'Đau họng, ho, nghẹt mũi kéo dài: khi nào nên khám Tai Mũi Họng?',
    category: 'Tai Mũi Họng',
    summary: 'Các dấu hiệu viêm họng, viêm mũi xoang, ho kéo dài và khàn tiếng cần được thăm khám chuyên khoa để tránh kéo dài hoặc tái phát nhiều lần.',
    tags: ['tai mũi họng', 'đau họng', 'ho kéo dài', 'viêm xoang'],
    isFeatured: true,
    specialty: 'Tai Mũi Họng',
    coverImage: covers.ent,
    sections: [
      {
        heading: 'Các triệu chứng Tai Mũi Họng thường gặp',
        paragraphs: [
          'Đau họng, ho, nghẹt mũi, chảy mũi, ù tai và khàn tiếng là những vấn đề rất phổ biến. Nhiều trường hợp có thể cải thiện sau vài ngày chăm sóc đúng cách, nhưng nếu kéo dài hoặc tái phát, người bệnh nên đi khám để tìm nguyên nhân.',
          'Triệu chứng Tai Mũi Họng có thể liên quan đến nhiễm virus, nhiễm khuẩn, dị ứng, trào ngược dạ dày, môi trường ô nhiễm hoặc thói quen sử dụng giọng nói quá mức.'
        ]
      },
      {
        heading: 'Khi nào không nên tự theo dõi thêm?',
        paragraphs: [
          'Nếu triệu chứng làm ảnh hưởng ăn uống, giấc ngủ, công việc hoặc kéo dài hơn dự kiến, việc thăm khám giúp hạn chế điều trị sai hướng. Người bệnh cũng không nên tự mua kháng sinh khi chưa được bác sĩ chỉ định.'
        ],
        bullets: [
          'Đau họng nhiều, nuốt đau, sốt cao hoặc nổi hạch cổ.',
          'Ho kéo dài trên 2-3 tuần hoặc ho kèm khó thở, đau ngực.',
          'Nghẹt mũi, chảy mũi đặc, đau vùng mặt kéo dài.',
          'Khàn tiếng trên 2 tuần, đặc biệt ở người hút thuốc hoặc nói nhiều.',
          'Ù tai, đau tai, chảy dịch tai hoặc nghe kém.',
          'Ngủ ngáy nhiều, nghi ngờ ngưng thở khi ngủ.'
        ]
      },
      {
        heading: 'Khám Tai Mũi Họng thường gồm những gì?',
        paragraphs: [
          'Bác sĩ sẽ hỏi về thời gian xuất hiện triệu chứng, yếu tố làm nặng, tiền sử dị ứng và thuốc đã dùng. Tùy tình trạng, bác sĩ có thể khám họng, mũi, tai bằng dụng cụ chuyên khoa hoặc chỉ định nội soi nếu cần.',
          'Nội soi Tai Mũi Họng giúp quan sát rõ hơn vùng mũi xoang, họng thanh quản, đặc biệt trong các trường hợp nghẹt mũi kéo dài, khàn tiếng, nghi ngờ viêm xoang hoặc polyp.'
        ]
      },
      {
        heading: 'Chăm sóc tại nhà để hỗ trợ hồi phục',
        paragraphs: [
          'Người bệnh nên uống đủ nước, giữ ấm vùng cổ, tránh khói thuốc, hạn chế đồ uống quá lạnh hoặc quá cay nếu đang đau họng. Với nghẹt mũi, có thể vệ sinh mũi bằng dung dịch phù hợp theo hướng dẫn.',
          'Nếu có cơ địa dị ứng, cần chú ý bụi nhà, lông thú, phấn hoa và thời tiết thay đổi. Việc kiểm soát yếu tố kích thích giúp giảm tái phát.'
        ]
      },
      {
        heading: 'Thông tin nên nói với bác sĩ',
        paragraphs: [
          'Hãy cho bác sĩ biết bạn ho khan hay ho đờm, đờm màu gì, có sốt không, có đau mặt hoặc mất mùi không. Nếu đã dùng thuốc trước đó, cần nói rõ tên thuốc và thời gian dùng.',
          'Với trẻ em, phụ huynh nên mô tả thêm tình trạng ăn ngủ, thở khò khè, nôn sau ho, sốt và tiền sử viêm tai giữa hoặc viêm amidan.'
        ]
      }
    ]
  },
  {
    title: 'Tăng huyết áp: cách theo dõi và những dấu hiệu cần khám Tim mạch',
    category: 'Tim mạch',
    summary: 'Tăng huyết áp thường diễn tiến âm thầm. Bài viết hướng dẫn cách đo huyết áp, theo dõi chỉ số và nhận biết dấu hiệu nguy hiểm cần đi khám sớm.',
    tags: ['tim mạch', 'tăng huyết áp', 'huyết áp cao', 'phòng ngừa'],
    isFeatured: false,
    specialty: 'Tim mạch',
    coverImage: covers.cardio,
    sections: [
      {
        heading: 'Vì sao tăng huyết áp cần được theo dõi nghiêm túc?',
        paragraphs: [
          'Tăng huyết áp là yếu tố nguy cơ quan trọng của bệnh tim mạch, đột quỵ, bệnh thận và nhiều biến chứng khác. Điểm đáng chú ý là nhiều người không có triệu chứng rõ ràng trong thời gian dài.',
          'Không nên chỉ đo huyết áp một lần rồi kết luận. Bác sĩ thường cần nhiều lần đo đúng kỹ thuật, kết hợp yếu tố nguy cơ và bệnh nền để đánh giá chính xác.'
        ]
      },
      {
        heading: 'Cách đo huyết áp tại nhà để kết quả đáng tin cậy',
        paragraphs: [
          'Trước khi đo, nên nghỉ ít nhất 5 phút, không uống cà phê, không hút thuốc và không vận động mạnh ngay trước đó. Ngồi thẳng lưng, đặt tay ngang mức tim và dùng vòng bít phù hợp.',
          'Nên ghi lại ngày giờ đo, chỉ số huyết áp, nhịp tim và hoàn cảnh đo. Nếu chỉ số thường xuyên cao, hãy mang bảng theo dõi này khi đi khám.'
        ],
        bullets: [
          'Đo vào cùng một khung giờ trong ngày nếu cần theo dõi dài hạn.',
          'Không nói chuyện trong lúc đo.',
          'Đo lại sau 1-2 phút nếu kết quả bất thường.',
          'Không tự ý tăng, giảm hoặc ngưng thuốc huyết áp.',
          'Mang máy đo huyết áp cá nhân khi tái khám nếu cần kiểm tra độ chính xác.'
        ]
      },
      {
        heading: 'Dấu hiệu cần đi khám hoặc cấp cứu',
        paragraphs: [
          'Một số triệu chứng có thể liên quan đến biến chứng tim mạch hoặc thần kinh và cần được xử trí sớm. Nếu xuất hiện dấu hiệu nặng, người bệnh nên đến cơ sở y tế ngay thay vì chờ lịch khám thông thường.'
        ],
        bullets: [
          'Đau ngực, khó thở, vã mồ hôi lạnh.',
          'Yếu liệt tay chân, méo miệng, nói khó.',
          'Đau đầu dữ dội, nhìn mờ, lơ mơ.',
          'Huyết áp rất cao kèm triệu chứng bất thường.',
          'Phù chân, hồi hộp trống ngực kéo dài hoặc ngất.'
        ]
      },
      {
        heading: 'Lối sống hỗ trợ kiểm soát huyết áp',
        paragraphs: [
          'Kiểm soát huyết áp không chỉ dựa vào thuốc. Ăn giảm muối, duy trì cân nặng hợp lý, vận động đều đặn, ngủ đủ và hạn chế rượu bia có vai trò quan trọng.',
          'Người bệnh nên trao đổi với bác sĩ về mục tiêu huyết áp phù hợp với tuổi, bệnh nền và nguy cơ cá nhân. Mỗi người có thể cần kế hoạch theo dõi khác nhau.'
        ]
      },
      {
        heading: 'Khám Tim mạch giúp đánh giá những gì?',
        paragraphs: [
          'Bác sĩ có thể đánh giá nguy cơ tim mạch tổng thể, kiểm tra thuốc đang dùng, xem xét xét nghiệm máu, điện tim hoặc siêu âm tim nếu cần. Mục tiêu là kiểm soát huyết áp bền vững và giảm nguy cơ biến chứng.',
          'Tái khám đúng hẹn giúp bác sĩ điều chỉnh điều trị kịp thời, đặc biệt khi chỉ số huyết áp thay đổi hoặc xuất hiện tác dụng không mong muốn của thuốc.'
        ]
      }
    ]
  },
  {
    title: 'Đau lưng, đau khớp và chấn thương nhẹ: khi nào nên khám Cơ xương khớp?',
    category: 'Cơ xương khớp',
    summary: 'Hướng dẫn nhận biết đau cơ xương khớp thông thường, dấu hiệu cần đi khám sớm và cách chuẩn bị thông tin trước khi gặp bác sĩ.',
    tags: ['cơ xương khớp', 'đau lưng', 'đau khớp', 'chấn thương nhẹ'],
    isFeatured: false,
    specialty: 'Cơ xương khớp',
    coverImage: covers.bone,
    sections: [
      {
        heading: 'Đau cơ xương khớp thường gặp trong những tình huống nào?',
        paragraphs: [
          'Đau lưng, đau cổ vai gáy, đau gối, đau cổ tay hoặc đau sau vận động là những lý do khám rất thường gặp. Nguyên nhân có thể liên quan đến tư thế, làm việc kéo dài, vận động quá mức, thoái hóa, viêm hoặc chấn thương.',
          'Một số cơn đau nhẹ có thể cải thiện khi nghỉ ngơi và điều chỉnh sinh hoạt. Tuy nhiên, nếu đau kéo dài, tái phát nhiều lần hoặc ảnh hưởng vận động, người bệnh nên được thăm khám.'
        ]
      },
      {
        heading: 'Dấu hiệu nên đi khám sớm',
        paragraphs: [
          'Không nên cố chịu đau hoặc tự dùng thuốc giảm đau kéo dài khi chưa rõ nguyên nhân. Việc khám sớm giúp phát hiện tình trạng cần điều trị chuyên sâu và tránh làm tổn thương nặng hơn.'
        ],
        bullets: [
          'Đau sau té ngã, tai nạn, va đập hoặc chấn thương thể thao.',
          'Sưng nóng đỏ khớp, hạn chế vận động rõ.',
          'Đau lan xuống tay hoặc chân, tê bì, yếu cơ.',
          'Đau lưng kèm sốt, sụt cân hoặc đau về đêm.',
          'Đau kéo dài trên 1-2 tuần dù đã nghỉ ngơi.',
          'Không thể chống chân, cầm nắm hoặc sinh hoạt bình thường.'
        ]
      },
      {
        heading: 'Cần chuẩn bị gì trước khi khám?',
        paragraphs: [
          'Người bệnh nên mô tả vị trí đau, thời điểm đau, yếu tố làm tăng hoặc giảm đau. Nếu đau sau chấn thương, hãy nói rõ cơ chế chấn thương: ngã như thế nào, va đập ở đâu, có nghe tiếng kêu trong khớp không.',
          'Nếu từng chụp X-quang, MRI, siêu âm khớp hoặc dùng thuốc giảm đau, hãy mang theo kết quả và đơn thuốc. Những thông tin này giúp bác sĩ quyết định có cần chỉ định thêm xét nghiệm hay hình ảnh học không.'
        ]
      },
      {
        heading: 'Chăm sóc ban đầu khi bị chấn thương nhẹ',
        paragraphs: [
          'Với chấn thương nhẹ mới xảy ra, người bệnh nên nghỉ ngơi, hạn chế vận động vùng đau và tránh xoa bóp mạnh khi đang sưng đau. Có thể chườm lạnh trong giai đoạn đầu nếu phù hợp.',
          'Nếu đau tăng nhanh, sưng nhiều, biến dạng chi, tê yếu hoặc không vận động được, cần đi khám ngay vì có thể có tổn thương dây chằng, gãy xương hoặc trật khớp.'
        ]
      },
      {
        heading: 'Làm gì để hạn chế tái phát?',
        paragraphs: [
          'Điều chỉnh tư thế làm việc, nghỉ giải lao khi ngồi lâu, khởi động trước vận động và duy trì cân nặng hợp lý giúp giảm áp lực lên cột sống và khớp. Người bệnh không nên quay lại vận động mạnh quá sớm khi cơn đau chưa hồi phục.',
          'Với đau mạn tính, bác sĩ có thể tư vấn bài tập, vật lý trị liệu, thuốc hoặc hướng điều trị khác tùy nguyên nhân. Việc tuân thủ kế hoạch theo dõi giúp hạn chế tái phát và cải thiện chất lượng sống.'
        ]
      }
    ]
  }
];

async function seedArticles() {
  await connectCentralDb();
  const [specialties, author] = await Promise.all([
    Specialty.find({}),
    User.findOne({ role: 'admin' }) || User.findOne({})
  ]);

  if (!author) {
    throw new Error('Seed articles requires at least one user account as author.');
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const seed of articleSeeds) {
    const slug = toSlug(seed.title);
    const specialty = matchSpecialty(seed.specialty, specialties);
    const payload = {
      title: seed.title,
      slug,
      summary: seed.summary,
      content: articleContent(seed.sections),
      coverImage: seed.coverImage,
      category: seed.category,
      specialtyId: specialty?._id || null,
      authorId: author._id,
      authorRole: author.role === 'doctor' ? 'doctor' : 'admin',
      doctorId: null,
      tags: seed.tags,
      status: 'published',
      isFeatured: Boolean(seed.isFeatured),
      isDeleted: false,
      publishedAt: new Date()
    };

    const existing = await Article.findOne({ slug });
    if (!existing) {
      await Article.create(payload);
      created += 1;
      continue;
    }

    const changed = ['title', 'summary', 'content', 'category', 'status', 'coverImage'].some((field) => existing[field] !== payload[field])
      || String(existing.specialtyId || '') !== String(payload.specialtyId || '')
      || existing.isFeatured !== payload.isFeatured
      || JSON.stringify(existing.tags || []) !== JSON.stringify(payload.tags);

    if (!changed) {
      skipped += 1;
      continue;
    }

    Object.assign(existing, payload);
    await existing.save();
    updated += 1;
  }

  const total = await Article.countDocuments({ isDeleted: false });
  console.log('Seed articles summary:', { created, updated, skipped, total });
}

seedArticles()
  .catch((error) => {
    console.error('Seed articles failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
