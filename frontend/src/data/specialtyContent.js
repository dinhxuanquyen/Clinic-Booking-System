const DEFAULT_CONTENT = {
  displayName: '',
  shortDescription: 'Chuyên khoa hỗ trợ thăm khám, tư vấn và theo dõi sức khỏe theo nhu cầu của người bệnh.',
  overview: 'Đội ngũ bác sĩ sẽ khai thác triệu chứng, tiền sử bệnh và tình trạng hiện tại để đưa ra hướng tư vấn phù hợp. Người bệnh nên chuẩn bị thông tin triệu chứng, thuốc đang dùng và kết quả khám trước đó nếu có.',
  symptoms: [
    'Có triệu chứng kéo dài hoặc tái phát nhiều lần',
    'Cần được bác sĩ chuyên khoa thăm khám và tư vấn',
    'Muốn theo dõi sức khỏe định kỳ hoặc tái khám sau điều trị'
  ],
  services: [
    'Thăm khám lâm sàng với bác sĩ chuyên khoa',
    'Tư vấn hướng chăm sóc và theo dõi sau khám',
    'Định hướng xét nghiệm hoặc kiểm tra bổ sung nếu cần',
    'Lập kế hoạch tái khám khi phù hợp'
  ],
  preparation: [
    'Mang theo giấy tờ tùy thân và hồ sơ y tế liên quan',
    'Ghi lại triệu chứng chính, thời điểm xuất hiện và yếu tố làm nặng',
    'Thông báo thuốc đang dùng hoặc tiền sử dị ứng nếu có'
  ],
  iconLabel: 'CK',
  accent: 'cyan',
  image: '/specialties/photos/specialty-general.jpg'
};

const CONTENT_BY_KEY = {
  nhi: {
    displayName: 'Nhi khoa',
    shortDescription: 'Khám và tư vấn sức khỏe trẻ em, theo dõi tăng trưởng, sốt, ho, tiêu hóa và các vấn đề thường gặp ở trẻ.',
    overview: 'Nhi khoa tập trung chăm sóc sức khỏe trẻ em từ sơ sinh đến tuổi thiếu niên. Bác sĩ đánh giá triệu chứng, tình trạng phát triển, dinh dưỡng và hướng dẫn phụ huynh theo dõi dấu hiệu cần đi khám lại.',
    symptoms: ['Sốt, ho, sổ mũi hoặc khò khè', 'Nôn, tiêu chảy, đau bụng hoặc biếng ăn', 'Chậm tăng cân, rối loạn giấc ngủ hoặc mệt mỏi kéo dài'],
    services: ['Khám nhi tổng quát', 'Tư vấn hô hấp và tiêu hóa trẻ em', 'Theo dõi dinh dưỡng và tăng trưởng', 'Tái khám sau điều trị'],
    preparation: ['Ghi lại nhiệt độ, thời gian sốt và thuốc đã dùng', 'Mang sổ tiêm chủng hoặc đơn thuốc cũ nếu có', 'Chuẩn bị thông tin ăn uống, ngủ nghỉ và triệu chứng trong ngày'],
    iconLabel: 'NHI',
    accent: 'blue',
    image: '/specialties/photos/specialty-pediatrics.jpg'
  },
  'tai mui hong': {
    displayName: 'Tai Mũi Họng',
    shortDescription: 'Khám đau họng, nghẹt mũi, ho kéo dài, viêm xoang, ù tai, đau tai và các bệnh lý tai mũi họng thường gặp.',
    overview: 'Tai Mũi Họng hỗ trợ người bệnh có triệu chứng vùng tai, mũi, họng, thanh quản hoặc đường hô hấp trên. Thăm khám đúng chuyên khoa giúp hạn chế tự điều trị sai hướng và theo dõi tốt các tình trạng tái phát.',
    symptoms: ['Đau họng, khàn tiếng hoặc ho kéo dài', 'Nghẹt mũi, chảy mũi, đau vùng mặt hoặc nghi viêm xoang', 'Ù tai, đau tai, chảy dịch tai hoặc nghe kém'],
    services: ['Khám tai mũi họng cơ bản', 'Tư vấn viêm họng, viêm amidan và viêm xoang', 'Đánh giá viêm mũi dị ứng', 'Tái khám tai mũi họng'],
    preparation: ['Không tự dùng kháng sinh khi chưa có chỉ định', 'Ghi lại thời gian ho, nghẹt mũi hoặc đau họng', 'Mang kết quả nội soi, xét nghiệm hoặc đơn thuốc cũ nếu có'],
    iconLabel: 'TMH',
    accent: 'cyan',
    image: '/specialties/photos/specialty-ent.jpg'
  },
  'da lieu': {
    displayName: 'Da liễu',
    shortDescription: 'Khám mụn, dị ứng, phát ban, ngứa, viêm da và tư vấn chăm sóc da an toàn.',
    overview: 'Da liễu giúp đánh giá các vấn đề về da, tóc, móng và phản ứng dị ứng. Bác sĩ khai thác yếu tố kích ứng, thói quen chăm sóc da và mức độ tổn thương để tư vấn hướng theo dõi phù hợp.',
    symptoms: ['Mụn kéo dài, viêm đỏ hoặc để lại thâm sẹo', 'Ngứa, nổi mẩn, phát ban hoặc dị ứng', 'Da khô, bong tróc, viêm da tái phát'],
    services: ['Khám da liễu cơ bản', 'Tư vấn điều trị mụn', 'Khám dị ứng da và viêm da', 'Tái khám da liễu'],
    preparation: ['Mang theo danh sách mỹ phẩm hoặc thuốc bôi đang dùng', 'Không tự nặn mụn hoặc bôi thuốc lạ trước khi khám', 'Chụp lại hình ảnh vùng da khi triệu chứng bùng phát nếu có'],
    iconLabel: 'DA',
    accent: 'green',
    image: '/specialties/photos/specialty-dermatology.jpg'
  },
  'tim mach': {
    displayName: 'Tim mạch',
    shortDescription: 'Khám đau ngực, hồi hộp, khó thở, tăng huyết áp và theo dõi các yếu tố nguy cơ tim mạch.',
    overview: 'Tim mạch tập trung đánh giá triệu chứng liên quan đến tim, mạch máu và huyết áp. Nếu có đau ngực dữ dội, khó thở nặng hoặc ngất, người bệnh nên đi cấp cứu thay vì chờ lịch khám.',
    symptoms: ['Đau ngực, tức ngực hoặc khó thở', 'Tim đập nhanh, hồi hộp, choáng váng', 'Tăng huyết áp hoặc cần theo dõi bệnh tim mạn tính'],
    services: ['Khám tim mạch tổng quát', 'Theo dõi huyết áp', 'Tư vấn bệnh tim mạn tính', 'Tái khám tim mạch'],
    preparation: ['Ghi lại chỉ số huyết áp tại nhà nếu có', 'Mang kết quả điện tim, siêu âm tim hoặc xét nghiệm cũ', 'Chuẩn bị danh sách thuốc tim mạch đang sử dụng'],
    iconLabel: 'TM',
    accent: 'red',
    image: '/specialties/photos/specialty-cardiology.jpg'
  },
  'rang ham mat': {
    displayName: 'Răng Hàm Mặt',
    shortDescription: 'Khám đau răng, sâu răng, ê buốt, viêm lợi và tư vấn chăm sóc răng miệng.',
    overview: 'Răng Hàm Mặt hỗ trợ thăm khám các vấn đề răng, nướu, hàm và khoang miệng. Khám sớm giúp kiểm soát đau, viêm và hạn chế biến chứng ảnh hưởng ăn uống.',
    symptoms: ['Đau răng, ê buốt hoặc sâu răng', 'Sưng nướu, chảy máu chân răng hoặc hôi miệng', 'Đau hàm, khó nhai hoặc nghi viêm lợi'],
    services: ['Khám răng tổng quát', 'Tư vấn sâu răng và ê buốt', 'Khám viêm lợi', 'Tái khám răng hàm mặt'],
    preparation: ['Vệ sinh răng miệng trước khi khám', 'Ghi lại vị trí đau và thời điểm đau tăng', 'Mang phim chụp hoặc hồ sơ nha khoa cũ nếu có'],
    iconLabel: 'RHM',
    accent: 'amber',
    image: '/specialties/photos/specialty-dental.jpg'
  },
  'co xuong khop': {
    displayName: 'Cơ xương khớp',
    shortDescription: 'Khám đau khớp, đau lưng, đau cổ vai gáy, hạn chế vận động và các vấn đề cơ xương khớp thường gặp.',
    overview: 'Cơ xương khớp tập trung đánh giá đau, cứng khớp, hạn chế vận động hoặc các vấn đề sau vận động. Bác sĩ có thể tư vấn hướng chăm sóc, theo dõi và phục hồi phù hợp.',
    symptoms: ['Đau khớp, sưng khớp hoặc cứng khớp buổi sáng', 'Đau lưng, đau cổ vai gáy kéo dài', 'Đau sau vận động hoặc khó cử động'],
    services: ['Khám cơ xương khớp tổng quát', 'Khám đau khớp và đau lưng', 'Tư vấn vận động và theo dõi', 'Tái khám cơ xương khớp'],
    preparation: ['Mô tả vị trí đau, mức độ đau và động tác làm đau tăng', 'Mang phim X-quang, MRI hoặc kết quả xét nghiệm nếu có', 'Không cố vận động mạnh vùng đau trước khi khám'],
    iconLabel: 'CXK',
    accent: 'indigo',
    image: '/specialties/photos/specialty-musculoskeletal.jpg'
  },
  'chan thuong chinh hinh': {
    displayName: 'Chấn thương chỉnh hình',
    shortDescription: 'Khám sau ngã xe, bong gân, trật khớp, đau sau va đập và chấn thương phần mềm.',
    overview: 'Chấn thương chỉnh hình hỗ trợ đánh giá tổn thương sau tai nạn, té ngã hoặc chấn thương khi vận động. Nếu đau dữ dội, biến dạng chi, chảy máu nhiều hoặc không cử động được, cần đi cấp cứu.',
    symptoms: ['Sưng đau sau va đập, té ngã hoặc tai nạn', 'Bong gân, nghi trật khớp hoặc hạn chế vận động', 'Đau tăng nhanh, bầm tím hoặc nghi tổn thương phần mềm'],
    services: ['Khám chấn thương phần mềm', 'Khám bong gân và trật khớp', 'Khám sau tai nạn hoặc ngã xe', 'Tái khám chấn thương'],
    preparation: ['Cố định vùng đau nếu nghi chấn thương', 'Mang phim chụp hoặc giấy ra viện nếu đã khám trước đó', 'Ghi lại thời điểm và cơ chế chấn thương'],
    iconLabel: 'CT',
    accent: 'orange',
    image: '/specialties/photos/specialty-orthopedics.jpg'
  },
  'noi tong quat': {
    displayName: 'Nội tổng quát',
    shortDescription: 'Khám các triệu chứng toàn thân, mệt mỏi, sốt, đau bụng, rối loạn tiêu hóa và tư vấn sức khỏe tổng quát.',
    overview: 'Nội tổng quát phù hợp khi người bệnh có triệu chứng chưa rõ chuyên khoa hoặc cần đánh giá sức khỏe ban đầu. Bác sĩ sẽ định hướng chuyên khoa sâu hơn nếu cần.',
    symptoms: ['Mệt mỏi, sốt, đau đầu hoặc triệu chứng toàn thân', 'Đau bụng, buồn nôn, rối loạn tiêu hóa', 'Cần tư vấn sức khỏe tổng quát hoặc bệnh mạn tính'],
    services: ['Khám nội tổng quát', 'Tư vấn sức khỏe tổng quát', 'Định hướng chuyên khoa phù hợp', 'Tái khám nội khoa'],
    preparation: ['Ghi lại triệu chứng chính và thời gian xuất hiện', 'Mang kết quả xét nghiệm hoặc toa thuốc cũ', 'Thông báo bệnh nền và thuốc đang dùng'],
    iconLabel: 'NTQ',
    accent: 'blue',
    image: '/specialties/photos/specialty-internal.jpg'
  },
  'tieu hoa': {
    displayName: 'Tiêu hóa',
    shortDescription: 'Khám đau bụng, đầy hơi, tiêu chảy, táo bón, buồn nôn và các rối loạn tiêu hóa thường gặp.',
    overview: 'Tiêu hóa hỗ trợ đánh giá triệu chứng đường tiêu hóa, gan mật và thói quen ăn uống. Thăm khám giúp định hướng chăm sóc, xét nghiệm hoặc nội soi khi cần.',
    symptoms: ['Đau bụng, đầy hơi, khó tiêu', 'Tiêu chảy, táo bón hoặc thay đổi thói quen đi tiêu', 'Buồn nôn, ợ nóng hoặc nghi trào ngược'],
    services: ['Khám tiêu hóa tổng quát', 'Tư vấn rối loạn tiêu hóa', 'Theo dõi đau dạ dày và trào ngược', 'Tái khám tiêu hóa'],
    preparation: ['Ghi lại chế độ ăn và thời điểm đau bụng', 'Mang kết quả xét nghiệm, siêu âm hoặc nội soi cũ nếu có', 'Thông báo thuốc dạ dày hoặc kháng sinh đã dùng'],
    iconLabel: 'TH',
    accent: 'green',
    image: '/specialties/photos/specialty-gastroenterology.jpg'
  },
  'san phu khoa': {
    displayName: 'Sản phụ khoa',
    shortDescription: 'Tư vấn sức khỏe phụ nữ, rối loạn kinh nguyệt, viêm nhiễm phụ khoa và theo dõi thai kỳ cơ bản.',
    overview: 'Sản phụ khoa hỗ trợ chăm sóc sức khỏe sinh sản, theo dõi các triệu chứng phụ khoa và tư vấn thai kỳ. Người bệnh nên cung cấp thông tin chu kỳ, triệu chứng và tiền sử liên quan.',
    symptoms: ['Rối loạn kinh nguyệt hoặc đau bụng kinh bất thường', 'Ngứa, khí hư bất thường hoặc nghi viêm nhiễm', 'Cần tư vấn sức khỏe sinh sản hoặc theo dõi thai kỳ'],
    services: ['Khám phụ khoa cơ bản', 'Tư vấn rối loạn kinh nguyệt', 'Theo dõi thai kỳ cơ bản', 'Tái khám phụ khoa'],
    preparation: ['Ghi lại ngày kinh gần nhất và triệu chứng kèm theo', 'Mang kết quả siêu âm hoặc xét nghiệm cũ nếu có', 'Thông báo tiền sử dị ứng thuốc hoặc bệnh nền'],
    iconLabel: 'SPK',
    accent: 'pink',
    image: '/specialties/photos/specialty-obgyn.jpg'
  },
  mat: {
    displayName: 'Mắt',
    shortDescription: 'Khám nhìn mờ, đau mắt, đỏ mắt, khô mắt và tư vấn chăm sóc thị lực.',
    overview: 'Chuyên khoa Mắt hỗ trợ đánh giá thị lực, triệu chứng đau đỏ mắt và các vấn đề thường gặp khi dùng thiết bị điện tử hoặc kính áp tròng.',
    symptoms: ['Nhìn mờ, mỏi mắt hoặc đau mắt', 'Đỏ mắt, chảy nước mắt hoặc khô mắt', 'Cần kiểm tra thị lực hoặc tư vấn kính'],
    services: ['Khám mắt cơ bản', 'Tư vấn khô mắt và mỏi mắt', 'Kiểm tra thị lực', 'Tái khám mắt'],
    preparation: ['Mang kính đang dùng hoặc toa kính cũ', 'Không tự nhỏ thuốc kéo dài khi chưa có chỉ định', 'Ghi lại thời gian nhìn mờ hoặc đau mắt'],
    iconLabel: 'MẮT',
    accent: 'cyan',
    image: '/specialties/photos/specialty-ophthalmology.jpg'
  },
  'than kinh': {
    displayName: 'Thần kinh',
    shortDescription: 'Khám đau đầu, chóng mặt, tê bì, rối loạn giấc ngủ và các triệu chứng thần kinh thường gặp.',
    overview: 'Thần kinh hỗ trợ đánh giá triệu chứng đau đầu, chóng mặt, tê yếu hoặc rối loạn cảm giác. Nếu có yếu liệt đột ngột, méo miệng, nói khó hoặc đau đầu dữ dội bất thường, cần đi cấp cứu.',
    symptoms: ['Đau đầu kéo dài hoặc tái phát', 'Chóng mặt, mất ngủ hoặc rối loạn giấc ngủ', 'Tê bì tay chân, yếu cơ hoặc rối loạn cảm giác'],
    services: ['Khám thần kinh tổng quát', 'Tư vấn đau đầu và chóng mặt', 'Theo dõi rối loạn giấc ngủ', 'Tái khám thần kinh'],
    preparation: ['Ghi lại tần suất đau đầu hoặc chóng mặt', 'Mang kết quả chụp chiếu, xét nghiệm hoặc đơn thuốc cũ', 'Thông báo bệnh nền và thuốc đang sử dụng'],
    iconLabel: 'TK',
    accent: 'indigo',
    image: '/specialties/photos/specialty-neurology.jpg'
  },
  'ho hap': {
    displayName: 'Hô hấp',
    shortDescription: 'Khám ho kéo dài, khó thở, khò khè, hen phế quản và các vấn đề đường hô hấp dưới.',
    overview: 'Hô hấp hỗ trợ đánh giá các triệu chứng liên quan phổi, phế quản và chức năng hô hấp. Người bệnh nên đi khám sớm khi khó thở tăng, sốt kéo dài hoặc ho ra máu.',
    symptoms: ['Ho kéo dài trên 2 tuần hoặc ho về đêm', 'Khó thở, khò khè, nặng ngực', 'Tiền sử hen, viêm phế quản hoặc viêm phổi tái phát'],
    services: ['Khám hô hấp tổng quát', 'Tư vấn hen và COPD', 'Theo dõi viêm phế quản và viêm phổi', 'Tái khám hô hấp'],
    preparation: ['Ghi lại thời điểm ho, yếu tố kích phát và thuốc đã dùng', 'Mang phim X-quang hoặc CT phổi nếu có', 'Thông báo tiền sử hút thuốc hoặc dị ứng'],
    iconLabel: 'HH',
    accent: 'cyan',
    image: '/specialties/photos/specialty-respiratory.jpg'
  },
  'noi tiet': {
    displayName: 'Nội tiết',
    shortDescription: 'Tư vấn đái tháo đường, rối loạn tuyến giáp, rối loạn chuyển hóa và theo dõi nội tiết.',
    overview: 'Nội tiết tập trung vào các rối loạn hormon, tuyến giáp, đường huyết và chuyển hóa. Theo dõi định kỳ giúp kiểm soát bệnh mạn tính ổn định hơn.',
    symptoms: ['Khát nhiều, tiểu nhiều, sụt cân hoặc tăng cân bất thường', 'Run tay, hồi hộp, mệt mỏi hoặc nghi rối loạn tuyến giáp', 'Cần theo dõi đái tháo đường hoặc rối loạn mỡ máu'],
    services: ['Khám nội tiết tổng quát', 'Theo dõi đái tháo đường', 'Tư vấn bệnh tuyến giáp', 'Tái khám nội tiết'],
    preparation: ['Mang kết quả đường huyết, HbA1c hoặc hormon tuyến giáp', 'Ghi lại thuốc đang dùng và chỉ số theo dõi tại nhà', 'Hỏi trước nếu cần nhịn ăn khi làm xét nghiệm'],
    iconLabel: 'NT',
    accent: 'blue',
    image: '/specialties/photos/specialty-endocrinology.jpg'
  },
  'tiet nieu': {
    displayName: 'Tiết niệu',
    shortDescription: 'Khám tiểu buốt, tiểu rắt, đau hông lưng, sỏi tiết niệu và các vấn đề đường tiểu.',
    overview: 'Tiết niệu hỗ trợ đánh giá triệu chứng đường tiết niệu, bàng quang, thận và tuyến tiền liệt. Người bệnh cần đi khám sớm khi sốt kèm đau hông lưng hoặc tiểu máu.',
    symptoms: ['Tiểu buốt, tiểu rắt, tiểu nhiều lần', 'Đau hông lưng, nghi sỏi tiết niệu', 'Tiểu máu hoặc nước tiểu bất thường'],
    services: ['Khám tiết niệu cơ bản', 'Tư vấn nhiễm khuẩn đường tiểu', 'Theo dõi sỏi tiết niệu', 'Tái khám tiết niệu'],
    preparation: ['Ghi lại tần suất đi tiểu và triệu chứng kèm theo', 'Mang kết quả siêu âm hoặc xét nghiệm nước tiểu nếu có', 'Uống nước vừa đủ trước khi khám nếu cần xét nghiệm'],
    iconLabel: 'TN',
    accent: 'cyan',
    image: '/specialties/photos/specialty-urology.jpg'
  },
  'tam ly': {
    displayName: 'Tâm lý - Sức khỏe tâm thần',
    shortDescription: 'Tư vấn căng thẳng, mất ngủ, lo âu, trầm buồn và các vấn đề sức khỏe tinh thần.',
    overview: 'Sức khỏe tâm thần giúp người bệnh trao đổi về cảm xúc, giấc ngủ, áp lực và những thay đổi hành vi. Việc thăm khám sớm giúp định hướng hỗ trợ phù hợp, không kỳ thị và bảo mật.',
    symptoms: ['Mất ngủ, căng thẳng hoặc lo âu kéo dài', 'Buồn chán, giảm hứng thú, khó tập trung', 'Áp lực học tập, công việc hoặc thay đổi hành vi'],
    services: ['Tư vấn sức khỏe tâm thần ban đầu', 'Sàng lọc lo âu và trầm cảm', 'Theo dõi rối loạn giấc ngủ', 'Tái khám tâm lý'],
    preparation: ['Ghi lại thay đổi giấc ngủ, cảm xúc và sinh hoạt', 'Chia sẻ thuốc hoặc chất kích thích đang dùng nếu có', 'Có thể đi cùng người thân nếu cần hỗ trợ thông tin'],
    iconLabel: 'TL',
    accent: 'purple',
    image: '/specialties/photos/specialty-mental-health.jpg'
  },
  'phuc hoi chuc nang': {
    displayName: 'Phục hồi chức năng',
    shortDescription: 'Tư vấn phục hồi vận động sau chấn thương, đau cơ xương khớp, tai biến hoặc phẫu thuật.',
    overview: 'Phục hồi chức năng hỗ trợ người bệnh cải thiện vận động, giảm đau và quay lại sinh hoạt hằng ngày sau bệnh lý hoặc chấn thương.',
    symptoms: ['Hạn chế vận động sau chấn thương hoặc phẫu thuật', 'Đau cơ, yếu cơ hoặc cần tập phục hồi', 'Cần kế hoạch vận động an toàn sau điều trị'],
    services: ['Đánh giá chức năng vận động', 'Tư vấn bài tập phục hồi', 'Theo dõi phục hồi sau chấn thương', 'Tái khám phục hồi chức năng'],
    preparation: ['Mang hồ sơ phẫu thuật hoặc kết quả chẩn đoán hình ảnh', 'Mặc trang phục dễ vận động', 'Mô tả hoạt động gây đau hoặc hạn chế'],
    iconLabel: 'PHCN',
    accent: 'green',
    image: '/specialties/photos/specialty-rehabilitation.jpg'
  },
  'dinh duong': {
    displayName: 'Dinh dưỡng',
    shortDescription: 'Tư vấn dinh dưỡng cho trẻ em, người lớn, bệnh mạn tính, kiểm soát cân nặng và phục hồi sức khỏe.',
    overview: 'Dinh dưỡng giúp xây dựng chế độ ăn phù hợp với tuổi, bệnh nền, cân nặng và mục tiêu sức khỏe. Tư vấn đúng giúp người bệnh thay đổi thói quen bền vững hơn.',
    symptoms: ['Sụt cân, tăng cân hoặc biếng ăn', 'Cần chế độ ăn cho bệnh mạn tính', 'Theo dõi dinh dưỡng trẻ em, phụ nữ mang thai hoặc người cao tuổi'],
    services: ['Đánh giá tình trạng dinh dưỡng', 'Tư vấn thực đơn cá nhân hóa', 'Theo dõi cân nặng và chỉ số cơ thể', 'Tái khám dinh dưỡng'],
    preparation: ['Ghi lại khẩu phần ăn trong 2-3 ngày gần nhất', 'Mang kết quả xét nghiệm liên quan nếu có', 'Chuẩn bị thông tin chiều cao, cân nặng và bệnh nền'],
    iconLabel: 'DD',
    accent: 'amber',
    image: '/specialties/photos/specialty-nutrition.jpg'
  },
  'ung buou': {
    displayName: 'Ung bướu',
    shortDescription: 'Tư vấn tầm soát, theo dõi khối u, bất thường hạch và định hướng khám chuyên sâu khi nghi ngờ ung bướu.',
    overview: 'Ung bướu hỗ trợ tư vấn tầm soát, đọc kết quả ban đầu và theo dõi các dấu hiệu nghi ngờ. Người bệnh nên chuẩn bị hồ sơ xét nghiệm, giải phẫu bệnh hoặc chẩn đoán hình ảnh nếu có.',
    symptoms: ['Sờ thấy khối bất thường hoặc hạch kéo dài', 'Sụt cân, mệt mỏi hoặc đau không rõ nguyên nhân', 'Cần tư vấn tầm soát ung thư theo nguy cơ cá nhân'],
    services: ['Tư vấn tầm soát ung bướu', 'Đánh giá kết quả xét nghiệm và chẩn đoán hình ảnh', 'Theo dõi sau điều trị', 'Tái khám ung bướu'],
    preparation: ['Mang toàn bộ kết quả xét nghiệm, sinh thiết hoặc phim chụp', 'Ghi lại thời điểm phát hiện khối bất thường', 'Chuẩn bị thông tin tiền sử gia đình nếu có'],
    iconLabel: 'UB',
    accent: 'pink',
    image: '/specialties/photos/specialty-oncology.jpg'
  },
  'than hoc': {
    displayName: 'Thận học',
    shortDescription: 'Khám phù, tiểu bất thường, suy thận, bệnh thận mạn và theo dõi chức năng thận.',
    overview: 'Thận học tập trung đánh giá chức năng thận, nước tiểu, huyết áp và biến chứng liên quan. Theo dõi sớm giúp hạn chế tiến triển bệnh thận mạn.',
    symptoms: ['Phù chân, mệt mỏi hoặc tăng huyết áp khó kiểm soát', 'Protein niệu, tiểu máu hoặc xét nghiệm thận bất thường', 'Cần theo dõi bệnh thận mạn'],
    services: ['Khám thận học tổng quát', 'Theo dõi chức năng thận', 'Tư vấn bệnh thận mạn', 'Tái khám thận học'],
    preparation: ['Mang kết quả creatinine, eGFR, nước tiểu hoặc siêu âm thận', 'Ghi lại thuốc huyết áp hoặc thuốc đang dùng', 'Theo dõi huyết áp tại nhà nếu có'],
    iconLabel: 'THẬN',
    accent: 'blue',
    image: '/specialties/photos/specialty-nephrology.jpg'
  }
};

CONTENT_BY_KEY['nhi khoa'] = CONTENT_BY_KEY.nhi;
CONTENT_BY_KEY['tmh'] = CONTENT_BY_KEY['tai mui hong'];
CONTENT_BY_KEY['ent'] = CONTENT_BY_KEY['tai mui hong'];
CONTENT_BY_KEY['nha khoa'] = CONTENT_BY_KEY['rang ham mat'];
CONTENT_BY_KEY['chan thuong'] = CONTENT_BY_KEY['chan thuong chinh hinh'];
CONTENT_BY_KEY['noi khoa'] = CONTENT_BY_KEY['noi tong quat'];
CONTENT_BY_KEY['phu khoa'] = CONTENT_BY_KEY['san phu khoa'];
CONTENT_BY_KEY['tam than'] = CONTENT_BY_KEY['tam ly'];
CONTENT_BY_KEY['suc khoe tam than'] = CONTENT_BY_KEY['tam ly'];

const LEGACY_SPECIALTY_IMAGE_PATHS = new Set([
  '/specialties/photos/medical-general.png',
  '/specialties/photos/doctor-female.jpg',
  '/specialties/photos/hospital-building.jpg',
  '/specialties/photos/hospital-campus.jpg',
  '/specialties/photos/orthopedics-xray.jpg',
  '/specialties/photos/dental-clinic.jpg',
  '/specialties/photos/pediatrics-care.jpg',
  '/specialties/cardiology.svg',
  '/specialties/dental.svg',
  '/specialties/dermatology.svg',
  '/specialties/endocrine.svg',
  '/specialties/ent.svg',
  '/specialties/eye.svg',
  '/specialties/gastro.svg',
  '/specialties/internal.svg',
  '/specialties/mental-health.svg',
  '/specialties/nephrology.svg',
  '/specialties/neurology.svg',
  '/specialties/nutrition.svg',
  '/specialties/oncology.svg',
  '/specialties/orthopedics.svg',
  '/specialties/pediatrics.svg',
  '/specialties/rehab.svg',
  '/specialties/respiratory.svg',
  '/specialties/trauma.svg',
  '/specialties/urology.svg',
  '/specialties/women.svg'
]);

const LEGACY_SPECIALTY_IMAGE_PATTERNS = [
  '/specialties/abstract/',
  '/specialties/illustrations/',
  '/specialties/icons/',
  'data:image/svg'
];

export function normalizeSpecialtyName(value = '') {
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

export function getSpecialtyContent(name = '') {
  const key = normalizeSpecialtyName(name);
  const content = CONTENT_BY_KEY[key] || DEFAULT_CONTENT;
  return {
    ...content,
    displayName: content.displayName || String(name || 'Chuyên khoa').trim() || 'Chuyên khoa'
  };
}

export function hasPlaceholderSpecialtyImage(image = '') {
  const value = String(image || '').trim();
  const lowerValue = value.toLowerCase();
  return (
    !value ||
    lowerValue.includes('placeholder-specialty') ||
    lowerValue.startsWith('data:image/svg') ||
    LEGACY_SPECIALTY_IMAGE_PATHS.has(value) ||
    LEGACY_SPECIALTY_IMAGE_PATHS.has(lowerValue) ||
    (lowerValue.includes('/specialties/') && lowerValue.endsWith('.svg')) ||
    LEGACY_SPECIALTY_IMAGE_PATTERNS.some((pattern) => lowerValue.includes(pattern))
  );
}
