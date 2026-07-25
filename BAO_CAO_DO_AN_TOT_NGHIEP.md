# Báo Cáo Đồ Án Tốt Nghiệp

**Tên đề tài:** Ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ

---

## Lời Cảm Ơn

Lời đầu tiên, em xin gửi lời cảm ơn chân thành đến Ban Giám hiệu Trường Đại học Phenikaa cùng quý thầy cô Trường Công nghệ thông tin đã giảng dạy, định hướng và tạo điều kiện thuận lợi cho em trong suốt quá trình học tập tại trường. Những kiến thức, kỹ năng và phương pháp tư duy được tích lũy trong thời gian học tập là nền tảng quan trọng giúp em thực hiện đồ án tốt nghiệp này.

Em xin bày tỏ lòng biết ơn sâu sắc đến giảng viên hướng dẫn, **ThS. Vũ Thị Ngọc Anh**, người đã tận tình hướng dẫn, góp ý và hỗ trợ em trong quá trình nghiên cứu, xây dựng và hoàn thiện đề tài. Những chỉ dẫn của cô đã giúp em nhìn nhận vấn đề rõ ràng hơn, điều chỉnh hướng triển khai phù hợp hơn và hoàn thiện sản phẩm theo đúng mục tiêu đề ra.

Bên cạnh đó, em xin cảm ơn gia đình, bạn bè và các anh chị đã luôn động viên, chia sẻ kinh nghiệm và hỗ trợ em trong quá trình thực hiện đồ án. Sự quan tâm và khích lệ của mọi người là nguồn động lực lớn giúp em vượt qua những khó khăn trong quá trình học tập và nghiên cứu.

Mặc dù đã cố gắng hoàn thiện đồ án một cách nghiêm túc, nhưng do thời gian và kinh nghiệm còn hạn chế, báo cáo khó tránh khỏi những thiếu sót. Em rất mong nhận được sự góp ý của quý thầy cô để có thể rút kinh nghiệm và hoàn thiện hơn trong tương lai.

Em xin trân trọng cảm ơn!

---

## Tóm Tắt Đồ Án Tốt Nghiệp

Đồ án tốt nghiệp với đề tài **“Ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ”** tập trung nghiên cứu và xây dựng một hệ thống web hỗ trợ phòng khám trong việc quản lý lịch hẹn, hàng đợi khám, hồ sơ khám bệnh và thông tin vận hành. Hệ thống hướng tới việc giảm bớt các thao tác thủ công trong quy trình đặt lịch, giúp bệnh nhân dễ dàng tra cứu thông tin khám, lựa chọn bác sĩ, đặt lịch và theo dõi kết quả khám sau buổi khám.

Ứng dụng được xây dựng với các nhóm người dùng chính gồm khách truy cập, bệnh nhân, bác sĩ và quản trị viên. Khách truy cập có thể xem thông tin công khai về bác sĩ, chuyên khoa, cơ sở khám, gói khám, cẩm nang và sử dụng chức năng tư vấn triệu chứng AI để định hướng chuyên khoa phù hợp. Bệnh nhân có thể đăng ký tài khoản, đặt lịch khám, quản lý lịch hẹn, theo dõi danh sách chờ, xem hồ sơ khám bệnh, đơn thuốc, kết quả cận lâm sàng, lịch tái khám và nhận thông báo từ hệ thống. Bác sĩ có thể quản lý lịch khám, xử lý lịch hẹn, tiếp nhận bệnh nhân, nhập và cập nhật hồ sơ khám bệnh, kê đơn thuốc, đính kèm kết quả cận lâm sàng và quản lý bài viết cá nhân. Quản trị viên có vai trò quản lý dữ liệu nền, tài khoản bác sĩ, lịch làm việc, lịch hẹn, hàng đợi khám, nội dung cẩm nang, thông báo, nhật ký hệ thống và thống kê vận hành.

Về mặt kỹ thuật, hệ thống được phát triển theo mô hình ứng dụng web với frontend sử dụng ReactJS, backend sử dụng Node.js/Express.js và cơ sở dữ liệu MongoDB. Ngoài các chức năng nghiệp vụ chính, hệ thống còn hỗ trợ upload tệp, xuất phiếu kết quả khám PDF, phân quyền theo vai trò, thông báo và biểu đồ thống kê. Kết quả đạt được là một ứng dụng có giao diện trực quan, phù hợp với quy mô phòng khám nhỏ và có khả năng mở rộng thêm các tính năng trong tương lai.

---

## Phần Mở Đầu

Trong bối cảnh chuyển đổi số ngày càng phát triển, nhu cầu ứng dụng công nghệ thông tin vào lĩnh vực y tế trở nên cần thiết hơn bao giờ hết. Đối với các phòng khám nhỏ, việc quản lý lịch hẹn, thông tin bệnh nhân, quá trình khám bệnh và lịch tái khám thường vẫn còn phụ thuộc nhiều vào phương pháp thủ công hoặc các công cụ rời rạc. Điều này dễ gây ra tình trạng trùng lịch, bỏ sót lịch hẹn, khó theo dõi hồ sơ khám bệnh và mất nhiều thời gian trong quá trình vận hành.

Đề tài **“Ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ”** được thực hiện nhằm xây dựng một hệ thống hỗ trợ đặt lịch và quản lý khám bệnh phù hợp với quy mô phòng khám nhỏ. Hệ thống không chỉ giúp bệnh nhân chủ động hơn trong việc đặt lịch và theo dõi kết quả khám, mà còn hỗ trợ bác sĩ và quản trị viên quản lý công việc một cách khoa học, thuận tiện và hiệu quả hơn.

---

# Chương 1. Giới Thiệu Tổng Quan Đề Tài

## 1.1. Đặt Vấn Đề

Trong hoạt động khám chữa bệnh tại các phòng khám nhỏ, việc tiếp nhận lịch hẹn và quản lý thông tin bệnh nhân là một trong những công việc diễn ra thường xuyên. Tuy nhiên, nhiều phòng khám vẫn xử lý các công việc này bằng sổ sách, điện thoại, tin nhắn hoặc các file lưu trữ đơn giản. Cách làm này tuy dễ triển khai ban đầu nhưng dễ phát sinh sai sót khi số lượng bệnh nhân tăng lên.

Một số vấn đề thường gặp có thể kể đến như bệnh nhân phải chờ đợi lâu do chưa có lịch hẹn rõ ràng, nhân viên khó kiểm soát các khung giờ trống, bác sĩ khó theo dõi danh sách bệnh nhân trong ngày và hồ sơ khám bệnh không được lưu trữ tập trung. Ngoài ra, bệnh nhân cũng gặp khó khăn khi muốn xem lại lịch sử khám, đơn thuốc, kết quả cận lâm sàng hoặc lịch tái khám.

Vì vậy, việc xây dựng một ứng dụng đặt lịch khám bệnh trực tuyến cho phòng khám nhỏ là cần thiết. Hệ thống giúp số hóa quy trình đặt lịch, hỗ trợ quản lý lịch hẹn, hồ sơ khám bệnh và thông báo, từ đó nâng cao hiệu quả vận hành và trải nghiệm của người dùng.

## 1.2. Lý Do Chọn Đề Tài

Đề tài được lựa chọn xuất phát từ nhu cầu thực tế của các phòng khám nhỏ trong việc tối ưu quy trình đặt lịch và quản lý khám bệnh. So với các bệnh viện lớn, phòng khám nhỏ thường có nguồn lực hạn chế hơn, nhưng vẫn cần một công cụ đủ đơn giản, dễ sử dụng và phù hợp với quy trình vận hành hằng ngày.

Bên cạnh đó, người bệnh ngày càng có nhu cầu chủ động trong việc tìm kiếm thông tin bác sĩ, chuyên khoa, cơ sở khám và đặt lịch trước khi đến phòng khám. Việc có một hệ thống đặt lịch trực tuyến giúp bệnh nhân tiết kiệm thời gian, đồng thời giúp phòng khám giảm áp lực tiếp nhận và hạn chế sai sót trong quá trình quản lý lịch hẹn.

Đề tài cũng tạo điều kiện để vận dụng các kiến thức đã học về phát triển ứng dụng web, thiết kế cơ sở dữ liệu, xây dựng API, phân quyền người dùng, xử lý tệp, xuất PDF và thiết kế giao diện người dùng vào một bài toán có tính thực tiễn.

## 1.3. Mục Tiêu Của Đề Tài

Mục tiêu chính của đề tài là xây dựng một ứng dụng web hỗ trợ đặt lịch khám bệnh cho phòng khám nhỏ, đáp ứng các nhu cầu cơ bản của bệnh nhân, bác sĩ và quản trị viên.

Cụ thể, hệ thống cần cho phép người dùng tra cứu thông tin bác sĩ, chuyên khoa, cơ sở khám, gói khám và cẩm nang sức khỏe; hỗ trợ bệnh nhân đăng ký, đăng nhập, đặt lịch khám, quản lý lịch hẹn, theo dõi hồ sơ khám bệnh và lịch tái khám. Đối với bác sĩ, hệ thống cần hỗ trợ xem lịch khám, xử lý lịch hẹn, quản lý hàng đợi, nhập và cập nhật hồ sơ khám bệnh, kê đơn thuốc, đính kèm kết quả cận lâm sàng và theo dõi đánh giá. Đối với quản trị viên, hệ thống cần hỗ trợ quản lý dữ liệu nền, tài khoản bác sĩ, lịch làm việc, lịch hẹn, hàng đợi khám, nội dung cẩm nang, thông báo và thống kê vận hành.

Ngoài ra, hệ thống cần có giao diện dễ sử dụng, phân quyền theo vai trò, hoạt động ổn định và có khả năng mở rộng trong tương lai.

## 1.4. Phạm Vi Nghiên Cứu

Phạm vi của đề tài tập trung vào việc xây dựng ứng dụng web phục vụ quy trình đặt lịch và quản lý khám bệnh tại phòng khám nhỏ. Hệ thống bao gồm các chức năng chính như quản lý tài khoản, tìm kiếm thông tin khám, đặt lịch, quản lý lịch hẹn, quản lý hàng đợi, nhập hồ sơ khám bệnh, theo dõi tái khám, thông báo, thống kê và xuất PDF.

Đề tài chưa đi sâu vào các nghiệp vụ phức tạp của bệnh viện lớn như quản lý viện phí chuyên sâu, bảo hiểm y tế ở mức tích hợp hệ thống quốc gia, thanh toán trực tuyến thực tế, quản lý kho thuốc hoặc kết nối thiết bị y tế. Các chức năng được xây dựng ở mức phù hợp với quy mô phòng khám nhỏ và mục tiêu của đồ án tốt nghiệp.

## 1.5. Đối Tượng Nghiên Cứu

Đối tượng nghiên cứu của đề tài là quy trình đặt lịch khám bệnh và quản lý quá trình khám tại phòng khám nhỏ. Trong đó, đồ án tập trung vào cách bệnh nhân tìm kiếm thông tin khám, gửi yêu cầu đặt lịch, theo dõi lịch hẹn, nhận kết quả khám và lịch tái khám; đồng thời nghiên cứu cách bác sĩ và quản trị viên xử lý lịch hẹn, hàng đợi, hồ sơ khám bệnh và dữ liệu vận hành.

Ngoài ra, đề tài còn nghiên cứu các thành phần kỹ thuật phục vụ xây dựng hệ thống như thiết kế giao diện web, xây dựng API, lưu trữ dữ liệu, phân quyền người dùng, upload tệp, xuất PDF, thông báo và thống kê.

## 1.6. Đối Tượng Sử Dụng Hệ Thống

Hệ thống hướng tới bốn nhóm người dùng chính. Khách truy cập có thể xem các thông tin công khai, tìm kiếm bác sĩ, chuyên khoa, cơ sở khám, gói khám, bài viết cẩm nang và sử dụng tư vấn triệu chứng AI. Bệnh nhân là người dùng đã đăng nhập, có thể đặt lịch khám, quản lý lịch hẹn, xem hồ sơ khám bệnh, kết quả cận lâm sàng, đơn thuốc, lịch tái khám và thông báo.

Bác sĩ sử dụng hệ thống để theo dõi lịch khám, quản lý hàng đợi, xử lý lịch hẹn, nhập và cập nhật hồ sơ khám bệnh, kê đơn thuốc, đính kèm kết quả cận lâm sàng, quản lý lịch làm việc, bài viết và đánh giá. Quản trị viên chịu trách nhiệm quản lý dữ liệu nền, tài khoản bác sĩ, cơ sở khám, chuyên khoa, gói khám, lịch làm việc, lịch hẹn, nội dung cẩm nang, thông báo, nhật ký và thống kê hệ thống.

## 1.7. Định Hướng Giải Pháp

Đề tài định hướng xây dựng hệ thống dưới dạng ứng dụng web, cho phép người dùng truy cập thông qua trình duyệt. Hệ thống được chia thành frontend, backend và cơ sở dữ liệu. Frontend đảm nhiệm phần giao diện và tương tác người dùng; backend xử lý nghiệp vụ, xác thực, phân quyền và cung cấp API; cơ sở dữ liệu lưu trữ thông tin người dùng, bác sĩ, lịch hẹn, hồ sơ khám bệnh và các dữ liệu liên quan.

Ứng dụng được thiết kế theo hướng phân quyền rõ ràng giữa bệnh nhân, bác sĩ và quản trị viên. Các chức năng được tổ chức theo từng vai trò nhằm giúp người dùng thao tác thuận tiện và hạn chế truy cập sai phạm vi. Ngoài ra, hệ thống tích hợp các chức năng hỗ trợ như tư vấn triệu chứng AI, upload tệp, xuất PDF, thông báo và biểu đồ thống kê để nâng cao hiệu quả sử dụng.

## 1.8. Bố Cục Đồ Án

Báo cáo đồ án tốt nghiệp với đề tài **“Ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ”** được trình bày theo các chương chính như sau: (i) Chương 1: Giới thiệu tổng quan đề tài; (ii) Chương 2: Khảo sát và phân tích yêu cầu hệ thống; (iii) Chương 3: Cơ sở lý thuyết và công nghệ sử dụng; (iv) Chương 4: Thiết kế, phát triển và triển khai hệ thống; (v) Chương 5: Các giải pháp và đóng góp nổi bật. Sau các chương nội dung chính là phần kết luận và hướng phát triển, tài liệu tham khảo và phụ lục nếu có.

**Chương 1: Giới thiệu tổng quan đề tài.** Chương này trình bày bối cảnh thực hiện đề tài, lý do chọn đề tài, mục tiêu, phạm vi nghiên cứu, đối tượng nghiên cứu, đối tượng sử dụng hệ thống và định hướng giải pháp. Nội dung chương giúp người đọc có cái nhìn tổng quan về bài toán đặt lịch khám bệnh tại phòng khám nhỏ và hướng tiếp cận của đồ án.

**Chương 2: Khảo sát và phân tích yêu cầu hệ thống.** Chương này tập trung khảo sát hiện trạng, phân tích các vấn đề còn tồn tại trong quy trình đặt lịch và quản lý khám bệnh tại phòng khám nhỏ. Từ đó xác định các tác nhân, yêu cầu chức năng, yêu cầu phi chức năng, quy trình nghiệp vụ, biểu đồ Use Case và bảng đặc tả các chức năng quan trọng của hệ thống.

**Chương 3: Cơ sở lý thuyết và công nghệ sử dụng.** Chương này giới thiệu các cơ sở lý thuyết và công nghệ được sử dụng để xây dựng hệ thống, bao gồm kiến trúc ứng dụng web, mô hình client - server, công nghệ frontend, backend, cơ sở dữ liệu, xác thực, phân quyền và các công nghệ hỗ trợ như upload file, xuất PDF, thông báo và biểu đồ thống kê.

**Chương 4: Thiết kế, phát triển và triển khai hệ thống.** Chương này trình bày quá trình thiết kế và xây dựng ứng dụng, bao gồm thiết kế kiến trúc tổng thể, thiết kế cơ sở dữ liệu, thiết kế API, thiết kế giao diện, xây dựng các chức năng cho bệnh nhân, bác sĩ và quản trị viên. Chương cũng trình bày kết quả giao diện hệ thống, kiểm thử phần mềm và quá trình triển khai ứng dụng.

**Chương 5: Các giải pháp và đóng góp nổi bật.** Chương này nêu ra những khó khăn gặp phải trong quá trình thực hiện đồ án, các giải pháp đã áp dụng để xử lý các vấn đề về quản lý lịch hẹn, hồ sơ khám bệnh, phân quyền, thông báo, thống kê và trải nghiệm người dùng. Đồng thời, chương cũng tổng kết những đóng góp chính của đề tài.

Cuối cùng, báo cáo trình bày phần **Kết luận và hướng phát triển**, trong đó tổng kết các kết quả đã đạt được, chỉ ra những hạn chế còn tồn tại và đề xuất các hướng mở rộng, nâng cấp hệ thống trong tương lai. Ngoài ra, báo cáo còn có phần **Tài liệu tham khảo** và **Phụ lục** nếu cần thiết.

---

# Chương 2. Khảo Sát Và Phân Tích Yêu Cầu Hệ Thống

## 2.1. Khảo Sát Hiện Trạng

Phần này trình bày hiện trạng đặt lịch và quản lý khám bệnh tại các phòng khám nhỏ, từ đó xác định các vấn đề cần giải quyết trong hệ thống.

### 2.1.1. Thực Trạng Đặt Lịch Khám Tại Phòng Khám Nhỏ

Tại nhiều phòng khám nhỏ, quy trình đặt lịch khám vẫn chủ yếu được thực hiện thông qua điện thoại, tin nhắn hoặc ghi chép thủ công. Bệnh nhân thường phải liên hệ trực tiếp với phòng khám để hỏi thông tin bác sĩ, chuyên khoa, khung giờ trống và tình trạng tiếp nhận lịch. Cách làm này phụ thuộc nhiều vào nhân viên tiếp nhận, dễ gây quá tải vào giờ cao điểm và khó đảm bảo thông tin luôn được cập nhật kịp thời.

Ngoài ra, bệnh nhân không phải lúc nào cũng nắm được đầy đủ thông tin về bác sĩ, dịch vụ khám hoặc lịch làm việc trước khi đặt lịch. Điều này có thể khiến quá trình lựa chọn lịch khám mất thời gian và thiếu chủ động.

### 2.1.2. Khó Khăn Trong Quản Lý Thủ Công

Việc quản lý lịch hẹn bằng sổ sách hoặc file rời rạc gây ra nhiều khó khăn cho phòng khám. Nhân viên và bác sĩ có thể gặp tình trạng trùng lịch, nhầm khung giờ, bỏ sót yêu cầu đổi lịch hoặc khó theo dõi trạng thái của từng lịch hẹn. Khi cần tra cứu lại thông tin bệnh nhân hoặc lịch sử khám, việc tìm kiếm thủ công cũng mất nhiều thời gian.

Bên cạnh đó, hồ sơ khám bệnh nếu không được lưu trữ tập trung sẽ gây khó khăn trong việc theo dõi quá trình điều trị, đơn thuốc, kết quả cận lâm sàng và kế hoạch tái khám của bệnh nhân.

### 2.1.3. Nhu Cầu Của Bệnh Nhân

Bệnh nhân có nhu cầu tra cứu thông tin khám một cách nhanh chóng, rõ ràng và có thể đặt lịch chủ động theo thời gian phù hợp. Người bệnh cũng cần theo dõi trạng thái lịch hẹn, nhận thông báo khi lịch được xác nhận hoặc thay đổi, xem lại hồ sơ khám bệnh, đơn thuốc, kết quả cận lâm sàng và lịch tái khám sau khi buổi khám kết thúc.

Ngoài ra, chức năng tư vấn triệu chứng AI giúp bệnh nhân có thêm kênh tham khảo ban đầu để định hướng chuyên khoa phù hợp trước khi đặt lịch khám.

### 2.1.4. Nhu Cầu Của Bác Sĩ Và Quản Trị Viên

Bác sĩ cần một công cụ hỗ trợ theo dõi lịch khám, danh sách bệnh nhân, hàng đợi khám và nhập hồ sơ khám bệnh nhanh chóng. Hệ thống cần cho phép bác sĩ cập nhật chẩn đoán, kết luận, lời dặn, đơn thuốc, kết quả cận lâm sàng và lịch tái khám.

Quản trị viên cần quản lý dữ liệu nền của hệ thống như bác sĩ, chuyên khoa, cơ sở khám, gói khám, lịch làm việc, nội dung cẩm nang, tài khoản bác sĩ, thông báo, nhật ký và thống kê vận hành. Các chức năng này giúp phòng khám kiểm soát hoạt động một cách tập trung và hiệu quả.

## 2.2. Khảo Sát Các Hệ Thống Tương Tự

### 2.2.1. BookingCare

BookingCare là nền tảng đặt lịch chăm sóc sức khỏe trực tuyến, cung cấp thông tin về bác sĩ, cơ sở y tế, chuyên khoa và dịch vụ khám. Người dùng có thể tìm kiếm bác sĩ theo chuyên khoa, xem thông tin chi tiết và đặt lịch khám phù hợp.

Hệ thống có ưu điểm là giao diện thân thiện, thông tin phong phú và hỗ trợ người dùng trong quá trình lựa chọn nơi khám. Tuy nhiên, BookingCare hướng tới quy mô lớn và nhiều cơ sở y tế, trong khi đề tài tập trung xây dựng giải pháp gọn nhẹ cho phòng khám nhỏ.

### 2.2.2. Medpro

Medpro là hệ thống hỗ trợ đặt lịch khám tại nhiều bệnh viện và cơ sở y tế. Nền tảng này cho phép người dùng đặt lịch, lấy số thứ tự, theo dõi thông tin khám và giảm thời gian chờ đợi khi đến cơ sở y tế.

Ưu điểm của Medpro là quy trình đặt lịch rõ ràng và phù hợp với bệnh viện hoặc cơ sở y tế có quy mô lớn. Tuy nhiên, đối với phòng khám nhỏ, một hệ thống đơn giản hơn, dễ quản trị hơn và phù hợp với nguồn lực vận hành hạn chế là cần thiết.

### 2.2.3. YouMed

YouMed cung cấp thông tin bác sĩ, phòng khám, chuyên khoa và dịch vụ y tế, đồng thời hỗ trợ người dùng đặt lịch khám trực tuyến. Nền tảng này giúp bệnh nhân tiếp cận thông tin y tế thuận tiện hơn và chủ động trong quá trình đặt lịch.

Tương tự các nền tảng lớn khác, YouMed có phạm vi triển khai rộng. Đề tài này kế thừa ý tưởng đặt lịch trực tuyến và tra cứu thông tin khám, nhưng điều chỉnh theo hướng phù hợp với quy mô phòng khám nhỏ và quy trình quản lý nội bộ đơn giản hơn.

### 2.2.4. Bảng So Sánh Và Nhận Xét

Qua khảo sát các hệ thống tương tự, có thể thấy các nền tảng đặt lịch khám trực tuyến đều tập trung vào việc giúp người dùng tìm kiếm thông tin khám và đặt lịch thuận tiện. Tuy nhiên, các hệ thống này thường phục vụ nhiều cơ sở y tế với quy mô lớn, nên có thể vượt quá nhu cầu vận hành của một phòng khám nhỏ.

Đề tài tập trung xây dựng một hệ thống gọn nhẹ hơn, nhưng vẫn đảm bảo các chức năng quan trọng như đặt lịch, quản lý lịch hẹn, hàng đợi khám, hồ sơ khám bệnh, tái khám, thông báo, thống kê và quản trị dữ liệu.

## 2.3. Quy Trình Nghiệp Vụ Của Hệ Thống

### 2.3.1. Quy Trình Bệnh Nhân Đặt Lịch Khám

Bệnh nhân truy cập hệ thống để xem thông tin công khai về bác sĩ, chuyên khoa, cơ sở khám, gói khám hoặc sử dụng tư vấn triệu chứng AI để định hướng chuyên khoa phù hợp. Khi có nhu cầu đặt lịch, bệnh nhân chọn bác sĩ, ngày khám, khung giờ và nhập lý do khám. Hệ thống kiểm tra thông tin đặt lịch, khung giờ trống và tạo lịch hẹn nếu hợp lệ.

Sau khi đặt lịch, bệnh nhân có thể theo dõi trạng thái lịch hẹn, nhận thông báo xác nhận hoặc thay đổi lịch từ hệ thống. Nếu lịch chưa phù hợp, bệnh nhân có thể gửi yêu cầu đổi lịch hoặc hủy lịch theo trạng thái cho phép.

### 2.3.2. Quy Trình Bác Sĩ Xử Lý Lịch Hẹn

Bác sĩ đăng nhập vào khu vực làm việc để xem tổng quan lịch khám, danh sách lịch hẹn và hàng đợi khám. Đối với các lịch cần xử lý, bác sĩ có thể xác nhận lịch, đổi lịch, hủy lịch hoặc ghi nhận bệnh nhân không đến khám. Khi bệnh nhân đến khám, bác sĩ tiếp nhận bệnh nhân và thực hiện quá trình khám bệnh.

Trong quá trình khám, bác sĩ có thể xem thông tin bệnh nhân, nhập chẩn đoán, kết luận, lời dặn, kê đơn thuốc, đính kèm kết quả cận lâm sàng và thiết lập lịch tái khám nếu cần.

### 2.3.3. Quy Trình Nhập Và Cập Nhật Hồ Sơ Khám Bệnh

Sau khi thực hiện khám bệnh, bác sĩ nhập hồ sơ khám bệnh cho bệnh nhân. Hồ sơ bao gồm thông tin chẩn đoán, kết luận, hướng điều trị, lời dặn, đơn thuốc, kết quả cận lâm sàng và kế hoạch tái khám. Hệ thống lưu hồ sơ khám bệnh, cập nhật trạng thái buổi khám và cho phép bệnh nhân xem lại kết quả sau khi hoàn tất.

Trong trường hợp bác sĩ nhập nhầm hoặc cần bổ sung thông tin, hệ thống cho phép cập nhật hồ sơ khám bệnh. Sau khi hồ sơ được cập nhật, hệ thống gửi thông báo để bệnh nhân biết rằng kết quả khám đã có thay đổi.

### 2.3.4. Quy Trình Quản Trị Hệ Thống

Quản trị viên đăng nhập vào khu vực quản trị để theo dõi tình hình vận hành của hệ thống. Quản trị viên có thể quản lý bác sĩ, tài khoản bác sĩ, chuyên khoa, cơ sở khám, gói khám, lịch làm việc, lịch hẹn, hàng đợi khám, bài viết cẩm nang, thông báo và nhật ký hệ thống.

Thông qua dashboard và các biểu đồ thống kê, quản trị viên có thể theo dõi số lượng lịch hẹn, trạng thái xử lý, lịch chờ xác nhận, yêu cầu đổi lịch, yêu cầu hủy lịch và các dữ liệu vận hành khác.

### 2.3.5. Sơ Đồ Quy Trình Nghiệp Vụ Tổng Quát

Sơ đồ quy trình nghiệp vụ tổng quát được xây dựng theo dạng Cross-Functional Flowchart, gồm các tác nhân chính: bệnh nhân, hệ thống, bác sĩ và quản trị viên. Sơ đồ mô tả luồng tổng thể từ khi bệnh nhân truy cập hệ thống, tìm kiếm thông tin, sử dụng tư vấn triệu chứng AI để định hướng chuyên khoa, đặt lịch khám, bác sĩ xử lý lịch hẹn, nhập hồ sơ khám bệnh, hệ thống lưu trữ kết quả và quản trị viên theo dõi vận hành.

**File sơ đồ:** [BAO_CAO_SO_DO_QUY_TRINH.drawio](./BAO_CAO_SO_DO_QUY_TRINH.drawio)

## 2.4. Xác Định Tác Nhân Hệ Thống

Hệ thống gồm bốn tác nhân chính: khách truy cập, bệnh nhân, bác sĩ và quản trị viên. Mỗi tác nhân có phạm vi sử dụng khác nhau tùy theo vai trò và quyền truy cập.

### 2.4.1. Khách Truy Cập

Khách truy cập là người dùng chưa đăng nhập vào hệ thống. Nhóm người dùng này có thể xem thông tin công khai như danh sách bác sĩ, chuyên khoa, cơ sở khám, gói khám, bài viết cẩm nang và sử dụng tư vấn triệu chứng AI. Khi muốn đặt lịch hoặc sử dụng các chức năng cá nhân, khách truy cập cần đăng ký hoặc đăng nhập tài khoản.

### 2.4.2. Bệnh Nhân

Bệnh nhân là người dùng đã có tài khoản và đăng nhập vào hệ thống. Bệnh nhân có thể đặt lịch khám, theo dõi trạng thái lịch hẹn, quản lý danh sách chờ, xem hồ sơ khám bệnh, đơn thuốc, kết quả cận lâm sàng, lịch tái khám, tải phiếu PDF và nhận thông báo từ hệ thống.

### 2.4.3. Bác Sĩ

Bác sĩ là người trực tiếp thực hiện quá trình khám bệnh. Bác sĩ sử dụng hệ thống để xem lịch khám, quản lý hàng đợi, xử lý lịch hẹn, nhập và cập nhật hồ sơ khám bệnh, kê đơn thuốc, đính kèm kết quả cận lâm sàng, thiết lập lịch tái khám, quản lý lịch làm việc, gói khám áp dụng, bài viết và đánh giá.

### 2.4.4. Quản Trị Viên

Quản trị viên là người có quyền quản lý toàn bộ dữ liệu và hoạt động vận hành của hệ thống. Quản trị viên có thể quản lý bác sĩ, tài khoản bác sĩ, chuyên khoa, cơ sở khám, gói khám, lịch làm việc, lịch hẹn, hàng đợi khám, nội dung cẩm nang, hình ảnh, tệp tải lên, thông báo, nhật ký và thống kê hệ thống.

## 2.5. Yêu Cầu Chức Năng

### 2.5.1. Nhóm Chức Năng Tài Khoản Và Xác Thực

Hệ thống cho phép người dùng đăng ký, đăng nhập, đăng xuất, xác thực tài khoản, quên mật khẩu, đặt lại mật khẩu, đổi mật khẩu và cập nhật thông tin cá nhân. Đối với bác sĩ, quản trị viên có thể tạo tài khoản, đặt lại mật khẩu và khóa hoặc mở tài khoản khi cần.

### 2.5.2. Nhóm Chức Năng Tìm Kiếm Và Xem Thông Tin Khám

Hệ thống cho phép người dùng xem thông tin bác sĩ, chuyên khoa, cơ sở khám, gói khám, bài viết cẩm nang và khung giờ khám còn trống. Người dùng có thể sử dụng tư vấn triệu chứng AI để nhận gợi ý chuyên khoa phù hợp trước khi đặt lịch.

### 2.5.3. Nhóm Chức Năng Đặt Lịch Khám

Bệnh nhân có thể chọn bác sĩ, ngày khám, khung giờ, nhập lý do khám và gửi yêu cầu đặt lịch. Hệ thống kiểm tra tính hợp lệ của lịch, tạo mã lịch khám và cập nhật trạng thái lịch hẹn.

### 2.5.4. Nhóm Chức Năng Quản Lý Lịch Hẹn Của Bệnh Nhân

Bệnh nhân có thể xem danh sách lịch hẹn, theo dõi trạng thái, hủy lịch, gửi yêu cầu đổi lịch hoặc hủy yêu cầu đổi lịch. Hệ thống gửi thông báo khi lịch hẹn được xác nhận, thay đổi hoặc cập nhật.

### 2.5.5. Nhóm Chức Năng Hồ Sơ Khám Bệnh Và Tái Khám

Bệnh nhân có thể xem hồ sơ khám bệnh, đơn thuốc, kết quả cận lâm sàng, lời dặn và lịch tái khám. Hệ thống hỗ trợ xuất phiếu kết quả khám PDF để bệnh nhân lưu trữ hoặc sử dụng khi cần thiết.

### 2.5.6. Nhóm Chức Năng Dành Cho Bác Sĩ

Bác sĩ có thể xem tổng quan lịch khám, quản lý hàng đợi, xử lý lịch hẹn, nhập và cập nhật hồ sơ khám bệnh, kê đơn thuốc, đính kèm kết quả cận lâm sàng, thiết lập lịch tái khám, quản lý lịch làm việc, gói khám áp dụng, bài viết cá nhân và theo dõi đánh giá của bệnh nhân.

### 2.5.7. Nhóm Chức Năng Dành Cho Quản Trị Viên

Quản trị viên có thể quản lý dữ liệu nền gồm bác sĩ, chuyên khoa, cơ sở khám, gói khám, lịch làm việc và bài viết cẩm nang. Ngoài ra, quản trị viên có thể quản lý tài khoản bác sĩ, lịch hẹn, hàng đợi khám, thông báo, nhật ký hệ thống, hình ảnh, tệp tải lên và theo dõi thống kê vận hành.

### 2.5.8. Nhóm Chức Năng Thống Kê, Thông Báo Và Xuất PDF

Hệ thống cung cấp dashboard thống kê cho bác sĩ và quản trị viên, hỗ trợ gửi thông báo cho người dùng khi có thay đổi về lịch hẹn hoặc hồ sơ khám bệnh. Hệ thống cũng hỗ trợ xuất phiếu đặt lịch và phiếu kết quả khám dưới dạng PDF.

## 2.6. Yêu Cầu Phi Chức Năng

Yêu cầu phi chức năng là các tiêu chí chất lượng mà hệ thống cần đáp ứng trong quá trình sử dụng. Đối với ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ, hệ thống cần đảm bảo dễ sử dụng, bảo mật, phản hồi tốt, hoạt động ổn định, có khả năng mở rộng và tương thích với các thiết bị phổ biến.

### 2.6.1. Tính Dễ Sử Dụng

Giao diện hệ thống cần rõ ràng, dễ hiểu và phù hợp với nhiều nhóm người dùng khác nhau. Các thao tác như tìm kiếm bác sĩ, đặt lịch khám, xem lịch hẹn, nhập hồ sơ khám bệnh và quản trị dữ liệu cần được tổ chức hợp lý, giúp người dùng thực hiện nhanh chóng mà không cần nhiều hướng dẫn.

### 2.6.2. Tính Bảo Mật

Hệ thống cần bảo vệ thông tin cá nhân và hồ sơ khám bệnh của người dùng. Các chức năng quan trọng phải yêu cầu đăng nhập, xác thực và phân quyền theo vai trò. Người dùng chỉ được truy cập các dữ liệu và chức năng phù hợp với quyền hạn của mình.

### 2.6.3. Tính Hiệu Năng

Hệ thống cần có tốc độ phản hồi tốt đối với các thao tác thường dùng như đăng nhập, tìm kiếm, đặt lịch, tải danh sách lịch hẹn và xem hồ sơ khám bệnh. Các truy vấn dữ liệu cần được tổ chức hợp lý để đảm bảo trải nghiệm sử dụng ổn định.

### 2.6.4. Tính Tin Cậy

Hệ thống cần hoạt động ổn định và hạn chế lỗi trong quá trình đặt lịch, cập nhật trạng thái lịch hẹn, lưu hồ sơ khám bệnh và gửi thông báo. Dữ liệu quan trọng cần được lưu trữ nhất quán để tránh mất mát hoặc sai lệch thông tin.

### 2.6.5. Tính Mở Rộng

Hệ thống cần được thiết kế theo hướng có thể mở rộng thêm chức năng trong tương lai, chẳng hạn như thanh toán trực tuyến, quản lý kho thuốc, tích hợp bảo hiểm y tế, nhắc lịch tự động hoặc ứng dụng di động.

### 2.6.6. Tính Tương Thích Thiết Bị

Ứng dụng cần hiển thị tốt trên các trình duyệt phổ biến và các kích thước màn hình khác nhau. Đối với bệnh nhân, hệ thống cần thuận tiện trên cả máy tính và thiết bị di động. Đối với bác sĩ và quản trị viên, hệ thống cần hoạt động ổn định trên máy tính hoặc laptop để hỗ trợ thao tác quản lý hiệu quả.

## 2.7. Biểu Đồ Use Case Tổng Quan

Biểu đồ Use Case tổng quan mô tả các tác nhân chính tham gia vào hệ thống và các nhóm chức năng mà mỗi tác nhân có thể thực hiện. Đối với hệ thống **“Ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ”**, các tác nhân chính gồm khách truy cập, bệnh nhân, bác sĩ và quản trị viên.

Khách truy cập có thể xem thông tin công khai và sử dụng tư vấn triệu chứng AI. Bệnh nhân có thể đặt lịch, quản lý lịch hẹn, xem hồ sơ khám bệnh và nhận thông báo. Bác sĩ có thể quản lý lịch khám, xử lý lịch hẹn, nhập hồ sơ khám bệnh và quản lý thông tin chuyên môn. Quản trị viên có thể quản lý dữ liệu nền, lịch hẹn, tài khoản bác sĩ, thông báo, nhật ký và thống kê vận hành.

**File sơ đồ:** [BAO_CAO_USE_CASE_TONG_QUAN.drawio](./BAO_CAO_USE_CASE_TONG_QUAN.drawio)

## 2.8. Biểu Đồ Use Case Phân Rã Theo Tác Nhân

Biểu đồ Use Case phân rã được xây dựng nhằm mô tả chi tiết hơn các chức năng của từng tác nhân trong hệ thống. Mỗi sơ đồ tập trung vào một nhóm người dùng, giúp làm rõ phạm vi chức năng và các quan hệ `<<include>>` giữa chức năng chính và chức năng con.

### 2.8.1. Use Case Của Bệnh Nhân

Use Case của bệnh nhân mô tả các chức năng mà người dùng đã đăng nhập với vai trò bệnh nhân có thể thực hiện. Các chức năng chính gồm quản lý tài khoản cá nhân, tìm kiếm và xem thông tin khám, tư vấn triệu chứng AI, đặt lịch khám, quản lý lịch hẹn, quản lý danh sách chờ, xem hồ sơ khám bệnh, theo dõi lịch tái khám, nhận thông báo và tải phiếu PDF.

**File sơ đồ:** [BAO_CAO_USE_CASE_BENH_NHAN.drawio](./BAO_CAO_USE_CASE_BENH_NHAN.drawio)

### 2.8.2. Use Case Của Bác Sĩ

Use Case của bác sĩ mô tả các chức năng hỗ trợ bác sĩ trong quá trình làm việc tại phòng khám. Bác sĩ có thể xem tổng quan lịch khám, quản lý hàng đợi, xử lý lịch hẹn, quản lý hồ sơ khám bệnh, kê đơn thuốc, đính kèm kết quả cận lâm sàng, thiết lập lịch tái khám, quản lý lịch làm việc, gói khám áp dụng, bài viết cá nhân, đánh giá và thông báo.

**File sơ đồ:** [BAO_CAO_USE_CASE_BAC_SI.drawio](./BAO_CAO_USE_CASE_BAC_SI.drawio)

### 2.8.3. Use Case Của Quản Trị Viên

Use Case của quản trị viên mô tả các chức năng quản lý và vận hành hệ thống. Quản trị viên có thể quản lý tài khoản cá nhân, dữ liệu nền, bác sĩ, tài khoản bác sĩ, chuyên khoa, cơ sở khám, gói khám, lịch làm việc, lịch hẹn, hàng đợi khám, nội dung cẩm nang, thông báo, nhật ký, hình ảnh, tệp tải lên và thống kê hệ thống.

**File sơ đồ:** [BAO_CAO_USE_CASE_QUAN_TRI_VIEN.drawio](./BAO_CAO_USE_CASE_QUAN_TRI_VIEN.drawio)

### 2.8.4. Use Case Của Khách Truy Cập

Use Case của khách truy cập mô tả các chức năng công khai mà người dùng chưa đăng nhập có thể sử dụng. Khách truy cập có thể truy cập hệ thống, tìm kiếm và xem thông tin khám, xem chi tiết bác sĩ, xem khung giờ khám còn trống, đọc bài viết cẩm nang, sử dụng tư vấn triệu chứng AI, đăng ký tài khoản, đăng nhập hoặc sử dụng chức năng quên mật khẩu.

**File sơ đồ:** [BAO_CAO_USE_CASE_KHACH_TRUY_CAP.drawio](./BAO_CAO_USE_CASE_KHACH_TRUY_CAP.drawio)

## 2.9. Đặc Tả Use Case Chi Tiết

Phần đặc tả Use Case chi tiết sẽ trình bày các Use Case quan trọng của hệ thống theo mẫu gồm tên Use Case, tác nhân, mục tiêu, tiền điều kiện, hậu điều kiện, luồng xử lý chính, luồng ngoại lệ và kết quả đạt được. Các Use Case nên được đặc tả gồm: đăng ký/đăng nhập, tư vấn triệu chứng AI, đặt lịch khám, quản lý lịch hẹn, nhập hồ sơ khám bệnh, cập nhật hồ sơ khám bệnh, quản lý bác sĩ, quản lý lịch làm việc, quản lý cẩm nang và xuất PDF kết quả khám.

---

## Danh Sách File Sơ Đồ Đã Hoàn Thành

- [Sơ đồ quy trình nghiệp vụ tổng quát](./BAO_CAO_SO_DO_QUY_TRINH.drawio)
- [Use Case tổng quan](./BAO_CAO_USE_CASE_TONG_QUAN.drawio)
- [Use Case bệnh nhân](./BAO_CAO_USE_CASE_BENH_NHAN.drawio)
- [Use Case bác sĩ](./BAO_CAO_USE_CASE_BAC_SI.drawio)
- [Use Case quản trị viên](./BAO_CAO_USE_CASE_QUAN_TRI_VIEN.drawio)
- [Use Case khách truy cập](./BAO_CAO_USE_CASE_KHACH_TRUY_CAP.drawio)
