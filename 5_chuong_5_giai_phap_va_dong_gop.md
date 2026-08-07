# CHƯƠNG 5: CÁC GIẢI PHÁP VÀ ĐÓNG GÓP NỔI BẬT

Sau quá trình khảo sát, phân tích yêu cầu, thiết kế kiến trúc, xây dựng chức năng, kiểm thử và chuẩn bị triển khai, hệ thống “Ứng dụng đặt lịch khám bệnh cho phòng khám nhỏ” đã hình thành một quy trình phần mềm tương đối đầy đủ cho ba nhóm người dùng chính là bệnh nhân, bác sĩ và quản trị viên. Nếu Chương 4 tập trung trình bày cách hệ thống được thiết kế và triển khai, thì Chương 5 tổng hợp lại những vấn đề nổi bật đã gặp trong quá trình thực hiện, các giải pháp được áp dụng và những đóng góp chính của đề tài.

Các giải pháp được trình bày trong chương này không tách rời khỏi nội dung đã phân tích ở các chương trước. Chúng xuất phát từ những khó khăn thực tế của phòng khám nhỏ như quản lý lịch hẹn thủ công, trùng lịch, thiếu cơ chế theo dõi trạng thái khám, khó tra cứu hồ sơ, thiếu thông báo kịp thời và thiếu công cụ giám sát vận hành. Trên cơ sở đó, hệ thống đã đưa ra các hướng xử lý phù hợp với phạm vi đồ án, đồng thời vẫn bảo đảm khả năng mở rộng trong các giai đoạn phát triển tiếp theo.

## 5.1. Khó khăn trong quá trình thực hiện

Khó khăn đầu tiên là việc chuyển đổi quy trình đặt lịch khám từ hình thức thủ công sang quy trình số hóa có nhiều trạng thái nghiệp vụ. Trong thực tế, một lịch hẹn không chỉ có hai trạng thái đơn giản là đã đặt hoặc đã hủy, mà còn có nhiều tình huống phát sinh như chờ xác nhận, đã xác nhận, đang khám, hoàn thành, bệnh nhân không đến, yêu cầu hủy hoặc yêu cầu đổi lịch. Nếu không tổ chức trạng thái rõ ràng, hệ thống dễ cho phép thao tác sai luồng, ví dụ chuyển trực tiếp từ lịch đã xác nhận sang hoàn thành khi chưa bắt đầu khám, hoặc hủy một lịch đã hoàn tất hồ sơ.

Khó khăn thứ hai là bảo đảm tính nhất quán giữa các nhóm người dùng. Một thao tác của bệnh nhân có thể ảnh hưởng đến bác sĩ và quản trị viên, chẳng hạn khi bệnh nhân đặt lịch mới, gửi yêu cầu đổi lịch hoặc yêu cầu hủy lịch. Ngược lại, khi bác sĩ xác nhận lịch, gọi bệnh nhân vào khám hoặc tạo hồ sơ khám bệnh, bệnh nhân cần nhận được thông tin cập nhật kịp thời. Vì vậy, hệ thống không thể chỉ xử lý từng màn hình riêng lẻ mà cần thiết kế cơ chế đồng bộ giữa frontend, backend, cơ sở dữ liệu và thông báo.

Khó khăn thứ ba nằm ở nghiệp vụ hồ sơ khám bệnh và tái khám. Hồ sơ khám bệnh chứa nhiều nhóm thông tin chuyên môn như triệu chứng, sinh hiệu, chẩn đoán, kết luận, đơn thuốc, lời dặn, tệp cận lâm sàng và kế hoạch tái khám. Bên cạnh đó, lịch tái khám phải liên kết được với hồ sơ gốc để bác sĩ và bệnh nhân theo dõi quá trình điều trị. Nếu dữ liệu không được thiết kế tốt, người dùng sẽ khó tra cứu lại lịch sử khám, còn bác sĩ khó nắm được tiến trình chăm sóc bệnh nhân.

Khó khăn thứ tư là phân quyền giữa các vai trò. Hệ thống có nhiều nhóm người dùng với quyền hạn khác nhau: khách truy cập chỉ xem thông tin công khai, bệnh nhân quản lý lịch và hồ sơ của mình, bác sĩ xử lý lịch và hồ sơ thuộc phạm vi chuyên môn, còn quản trị viên quản lý dữ liệu nền và vận hành. Nếu chỉ kiểm soát quyền ở giao diện, dữ liệu vẫn có nguy cơ bị truy cập trái phép thông qua API. Do đó, phân quyền phải được thực hiện đồng bộ ở cả backend và frontend.

Khó khăn thứ năm là đảm bảo trải nghiệm giao diện cho nhiều nghiệp vụ khác nhau. Hệ thống có nhiều màn hình: trang công khai, đặt lịch, lịch hẹn cá nhân, hồ sơ khám bệnh, khu vực bác sĩ, hàng đợi khám, lịch làm việc, quản lý dữ liệu nền, lịch hẹn admin, thông báo và nhật ký hệ thống. Mỗi màn hình có mục tiêu sử dụng khác nhau, nhưng vẫn cần thống nhất về bố cục, màu sắc trạng thái, cách hiển thị nút thao tác, modal và thông báo để người dùng không bị rối khi chuyển giữa các chức năng.

Ngoài ra, hệ thống còn phải xử lý một số vấn đề kỹ thuật như upload file, xuất PDF, gửi email, thông báo realtime, kiểm thử tự động, cấu hình triển khai và quản lý biến môi trường. Các thành phần này tuy không phải nghiệp vụ đặt lịch trực tiếp nhưng lại ảnh hưởng lớn đến độ hoàn chỉnh và tính thực tế của ứng dụng.

## 5.2. Giải pháp quản lý lịch hẹn theo trạng thái

Để xử lý nghiệp vụ lịch hẹn, hệ thống xây dựng cơ chế quản lý trạng thái theo dạng state machine. Các trạng thái chính của lịch hẹn gồm `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `cancel_requested`, `reschedule_requested` và `reschedule_rejected`. Mỗi trạng thái chỉ được phép chuyển sang một số trạng thái hợp lệ, giúp kiểm soát chặt chẽ vòng đời của lịch hẹn.

Với cách tiếp cận này, lịch mới được tạo ở trạng thái chờ xác nhận. Khi bác sĩ hoặc quản trị viên xác nhận, lịch chuyển sang trạng thái đã xác nhận và có thể được đưa vào hàng đợi khám. Khi bệnh nhân bắt đầu được khám, lịch chuyển sang trạng thái đang khám. Sau khi bác sĩ tạo hồ sơ khám bệnh, lịch chuyển sang trạng thái hoàn thành. Các trường hợp hủy, đổi lịch hoặc bệnh nhân không đến khám được xử lý bằng các nhánh trạng thái riêng để tránh làm mất thông tin nghiệp vụ.

Giải pháp này giúp hệ thống tránh được các thao tác sai luồng. Ví dụ, lịch đã hoàn thành không thể tiếp tục bị hủy như một lịch đang chờ; lịch đang chờ xác nhận không thể chuyển thẳng sang hoàn thành; yêu cầu đổi lịch phải được duyệt hoặc từ chối thay vì thay đổi ngày giờ một cách tùy tiện. Nhờ đó, dữ liệu lịch hẹn phản ánh đúng quá trình vận hành thực tế của phòng khám.

Bên cạnh kiểm soát trạng thái, hệ thống còn áp dụng cơ chế kiểm tra khung giờ để tránh trùng lịch. Khi bệnh nhân đặt lịch, backend kiểm tra bác sĩ, cơ sở, chuyên khoa, ngày khám, khung giờ, lịch làm việc và các lịch đang giữ slot. Các trạng thái có khả năng giữ slot được xác định rõ, giúp hệ thống biết lịch nào đang chiếm khung giờ và lịch nào đã không còn hiệu lực. Trường hợp nhiều người cùng đặt một khung giờ được xử lý bằng kiểm tra dữ liệu và ràng buộc ở cơ sở dữ liệu.

Một điểm nổi bật khác là danh sách chờ. Khi slot mong muốn đã đầy, bệnh nhân có thể tham gia danh sách chờ. Khi slot được giải phóng do lịch bị hủy hoặc hết hiệu lực, hệ thống tìm bệnh nhân phù hợp trong danh sách chờ, tạo lời mời và giới hạn thời gian xác nhận. Cơ chế này giúp tận dụng lại khung giờ trống, giảm lãng phí tài nguyên khám và tăng cơ hội đặt lịch cho bệnh nhân.

Nhìn chung, giải pháp quản lý lịch hẹn theo trạng thái giúp hệ thống xử lý được nhiều tình huống thực tế hơn so với mô hình đặt lịch đơn giản. Đây là nền tảng quan trọng cho các chức năng khác như hàng đợi khám, phiếu số thứ tự, thông báo, hồ sơ khám bệnh, đánh giá bác sĩ và thống kê vận hành.

## 5.3. Giải pháp quản lý hồ sơ khám bệnh

Hồ sơ khám bệnh được thiết kế như một phần trung tâm của quy trình sau khi lịch hẹn được xử lý. Thay vì chỉ lưu trạng thái lịch hoàn thành, hệ thống cho phép bác sĩ tạo hồ sơ khám với đầy đủ thông tin chuyên môn gồm triệu chứng, bệnh sử, chỉ số sinh tồn, dị ứng, chẩn đoán, kết luận, đơn thuốc, lời dặn, tệp đính kèm và kế hoạch tái khám. Hồ sơ được liên kết trực tiếp với lịch hẹn, bệnh nhân, bác sĩ, cơ sở và chuyên khoa để bảo đảm khả năng tra cứu về sau.

Giải pháp này giúp dữ liệu khám bệnh không bị rời rạc. Khi bác sĩ tạo hồ sơ, hệ thống cập nhật lịch hẹn sang trạng thái hoàn thành, gửi thông báo cho bệnh nhân và cho phép xuất phiếu kết quả khám dạng PDF. Bệnh nhân có thể xem lại hồ sơ trong khu vực cá nhân, còn bác sĩ có thể tra cứu danh sách hồ sơ để theo dõi lịch sử điều trị. Quản trị viên cũng có thể hỗ trợ kiểm tra dữ liệu khi cần thiết thông qua các chức năng quản trị.

Đối với tệp cận lâm sàng, hệ thống hỗ trợ upload ảnh hoặc PDF và gắn vào hồ sơ khám bệnh. Điều này giúp hồ sơ không chỉ lưu thông tin dạng văn bản mà còn lưu được tài liệu liên quan như ảnh xét nghiệm, kết quả chẩn đoán hình ảnh hoặc phiếu cận lâm sàng. Cách tổ chức này phù hợp với thực tế khám bệnh, nơi kết quả điều trị thường cần nhiều loại minh chứng khác nhau.

Phần tái khám là một đóng góp đáng chú ý trong giải pháp quản lý hồ sơ. Khi tạo hồ sơ, bác sĩ có thể đánh dấu bệnh nhân cần tái khám và chọn ngày tái khám khuyến nghị. Hệ thống lưu trạng thái tái khám như cần đặt lịch, đã đặt lịch, đã hoàn thành hoặc quá hạn. Khi bệnh nhân đặt lịch tái khám từ hồ sơ cũ, lịch mới được liên kết lại với hồ sơ gốc thông qua mã liên kết. Nhờ đó, bác sĩ có thể theo dõi tiến trình điều trị thay vì chỉ nhìn từng lần khám riêng lẻ.

Hệ thống cũng xử lý các tình huống phát sinh trong tái khám. Nếu bệnh nhân hủy lịch tái khám, hồ sơ gốc có thể quay về trạng thái cần đặt lại hoặc quá hạn. Nếu lịch tái khám hoàn thành, hồ sơ gốc được đánh dấu hoàn tất theo dõi. Nếu bác sĩ cũ không còn hoạt động, bệnh nhân có thể được hướng dẫn chọn bác sĩ khác phù hợp trong cùng phạm vi chuyên khoa và cơ sở. Những quy tắc này giúp nghiệp vụ tái khám có tính thực tế hơn.

Nhờ giải pháp quản lý hồ sơ khám bệnh, hệ thống không chỉ phục vụ việc đặt lịch mà còn hỗ trợ một phần quy trình quản lý sau khám. Đây là yếu tố làm cho ứng dụng có giá trị hơn đối với mô hình phòng khám nhỏ, nơi dữ liệu bệnh nhân cần được lưu trữ, tra cứu và sử dụng lại trong nhiều lần khám.

## 5.4. Giải pháp phân quyền theo vai trò

Phân quyền theo vai trò được xây dựng để bảo đảm mỗi nhóm người dùng chỉ truy cập được các chức năng phù hợp. Hệ thống sử dụng JWT để xác thực phiên đăng nhập và middleware ở backend để kiểm tra quyền truy cập. Sau khi người dùng đăng nhập thành công, token chứa thông tin định danh và vai trò được gửi về frontend. Các request đến API bảo vệ phải kèm token hợp lệ, nếu không backend sẽ từ chối xử lý.

Ở backend, cơ chế `authMiddleware` kiểm tra token, xác định người dùng hiện tại và gắn thông tin người dùng vào request. Sau đó, `roleMiddleware` kiểm tra vai trò của người dùng trước khi cho phép truy cập route tương ứng. Ví dụ, API quản trị chỉ cho phép tài khoản admin truy cập; API bác sĩ chỉ cho phép tài khoản doctor có hồ sơ bác sĩ liên kết; API bệnh nhân chỉ cho phép người dùng xem lịch hẹn hoặc hồ sơ thuộc tài khoản của mình.

Ở frontend, hệ thống sử dụng `ProtectedRoute` để bảo vệ các tuyến giao diện. Bệnh nhân được truy cập các trang như lịch hẹn cá nhân và hồ sơ khám bệnh. Bác sĩ được truy cập khu vực Doctor Portal gồm dashboard, hàng đợi khám, lịch hẹn, hồ sơ, lịch làm việc, bài viết và đánh giá. Quản trị viên được truy cập khu vực Admin Portal gồm quản lý cơ sở, chuyên khoa, bác sĩ, tài khoản, lịch làm việc, lịch hẹn, gói khám, bài viết và nhật ký hệ thống.

Một điểm quan trọng là phân quyền không chỉ dừng ở việc ẩn hiện menu. Backend vẫn kiểm tra quyền trên từng nghiệp vụ cụ thể. Chẳng hạn, bác sĩ không được xử lý lịch hẹn của bác sĩ khác; bệnh nhân không được xem hồ sơ khám bệnh của người khác; người dùng không có quyền không thể tải PDF hồ sơ khám. Điều này giúp hạn chế rủi ro truy cập trái phép thông qua việc gọi API trực tiếp.

Đối với tài khoản bác sĩ, hệ thống còn có cơ chế quản trị riêng. Quản trị viên có thể tạo tài khoản đăng nhập cho bác sĩ, sinh mật khẩu tạm thời và yêu cầu bác sĩ đổi mật khẩu trong lần đăng nhập đầu tiên. Cách làm này phù hợp với quy trình phòng khám, nơi tài khoản bác sĩ thường do quản trị viên cấp phát thay vì để bác sĩ tự đăng ký như bệnh nhân.

Giải pháp phân quyền theo vai trò giúp hệ thống bảo vệ dữ liệu nhạy cảm, đồng thời làm rõ phạm vi trách nhiệm của từng nhóm người dùng. Đây là yêu cầu cần thiết đối với ứng dụng y tế vì dữ liệu lịch hẹn và hồ sơ khám bệnh có tính riêng tư cao.

## 5.5. Giải pháp thông báo cho người dùng

Thông báo là thành phần quan trọng giúp các bên liên quan cập nhật kịp thời khi có sự kiện mới. Trong hệ thống, thông báo được tạo sau nhiều nghiệp vụ như đặt lịch mới, xác nhận lịch, yêu cầu đổi lịch, yêu cầu hủy lịch, gọi bệnh nhân vào khám, hoàn tất hồ sơ, cập nhật hồ sơ, tạo lời mời danh sách chờ hoặc nhắc tái khám.

Giải pháp thông báo được xây dựng theo hai lớp. Lớp thứ nhất là lưu trữ thông báo trong MongoDB thông qua collection `Notifications`. Mỗi thông báo có người nhận hoặc vai trò nhận, tiêu đề, nội dung, loại thông báo, trạng thái đã đọc và đường dẫn liên quan. Nhờ lưu vào cơ sở dữ liệu, người dùng vẫn có thể xem lại thông báo ngay cả khi không online tại thời điểm sự kiện phát sinh.

Lớp thứ hai là thông báo thời gian thực bằng Socket.IO. Khi một sự kiện quan trọng xảy ra, backend tạo bản ghi thông báo và phát sự kiện đến đúng người dùng hoặc đúng vai trò. Ví dụ, khi bệnh nhân đặt lịch mới, bác sĩ và quản trị viên có thể nhận thông báo; khi bác sĩ cập nhật trạng thái khám, bệnh nhân có thể nhận thông tin mới; khi hồ sơ khám được tạo, bệnh nhân được báo để xem kết quả. Cách kết hợp này giúp hệ thống vừa có lịch sử thông báo, vừa có khả năng cập nhật tức thời.

Ngoài thông báo trong ứng dụng, hệ thống còn hỗ trợ gửi email trong một số trường hợp như OTP xác thực, quên mật khẩu, xác nhận lịch hẹn, thông báo cho bác sĩ hoặc nhắc danh sách chờ. Email được xử lý ở backend để bảo vệ thông tin SMTP/Brevo và tránh lộ cấu hình ở phía frontend. Trong môi trường kiểm thử, thao tác gửi email có thể được bỏ qua để không phụ thuộc mạng và dịch vụ ngoài.

Một điểm đáng chú ý là các tác vụ gửi thông báo hoặc gửi email không làm hỏng nghiệp vụ chính nếu gặp lỗi phụ trợ. Ví dụ, nếu gửi email thất bại, lịch hẹn hoặc hồ sơ khám vẫn được lưu thành công, còn lỗi được ghi lại để kiểm tra sau. Cách xử lý này giúp hệ thống ổn định hơn vì các dịch vụ ngoài như SMTP hoặc Gemini API có thể không luôn luôn khả dụng.

Giải pháp thông báo giúp giảm tình trạng bỏ sót thông tin trong quá trình vận hành phòng khám. Bệnh nhân biết lịch của mình đã được xác nhận hay thay đổi, bác sĩ biết có lịch mới cần xử lý, quản trị viên biết các yêu cầu đang chờ và hệ thống có thể nhắc người dùng về các sự kiện quan trọng.

## 5.6. Giải pháp dashboard và thống kê

Dashboard và thống kê được xây dựng nhằm hỗ trợ bác sĩ và quản trị viên theo dõi nhanh tình hình vận hành. Thay vì phải mở từng danh sách dữ liệu riêng lẻ, người dùng có thể xem các chỉ số tổng quan ngay khi đăng nhập vào khu vực làm việc. Điều này phù hợp với yêu cầu của phòng khám nhỏ, nơi người vận hành cần nắm được số lịch trong ngày, lịch đang chờ xử lý, số bệnh nhân, số bác sĩ, hồ sơ khám và các sự kiện phát sinh.

Đối với bác sĩ, dashboard tập trung vào công việc chuyên môn trong ngày. Các thông tin như lịch hẹn hôm nay, bệnh nhân tiếp theo, hàng đợi khám, lịch đang chờ xác nhận, lịch đã hoàn thành hoặc đánh giá gần đây giúp bác sĩ ưu tiên xử lý đúng việc. Màn hình hàng đợi khám kết hợp số thứ tự, trạng thái tiếp nhận và thao tác cập nhật giúp bác sĩ chuyển từ việc theo dõi lịch sang việc bắt đầu khám và tạo hồ sơ một cách liền mạch.

Đối với quản trị viên, dashboard tập trung vào quản lý vận hành. Các số liệu như số tài khoản, cơ sở khám, chuyên khoa, bác sĩ, dịch vụ, lịch hẹn, yêu cầu cần xử lý và nhật ký hệ thống giúp quản trị viên nắm được tình hình tổng thể. Những dữ liệu này hỗ trợ việc ra quyết định như bổ sung lịch làm việc, cập nhật thông tin bác sĩ, xử lý yêu cầu đổi/hủy lịch hoặc kiểm tra các thao tác bất thường.

Hệ thống cũng sử dụng các bộ lọc theo ngày, trạng thái, bác sĩ, chuyên khoa hoặc nhóm dữ liệu để người dùng dễ tra cứu. Việc kết hợp dashboard tổng quan với danh sách chi tiết giúp cân bằng giữa nhu cầu nhìn nhanh và nhu cầu xử lý cụ thể. Khi cần, người dùng có thể đi từ số liệu tổng quan đến màn hình chi tiết để thao tác tiếp.

Giải pháp dashboard và thống kê tuy chưa phải hệ thống báo cáo phân tích chuyên sâu, nhưng đã đáp ứng được nhu cầu quản lý cơ bản của phòng khám nhỏ. Đây là nền tảng để sau này mở rộng thêm các báo cáo như doanh thu, tần suất khám theo chuyên khoa, hiệu suất bác sĩ, tỷ lệ hủy lịch, tỷ lệ không đến khám hoặc xu hướng đặt lịch theo thời gian.

## 5.7. Giải pháp nâng cao trải nghiệm người dùng

Trải nghiệm người dùng được cải thiện thông qua việc phân tách giao diện theo từng vai trò và từng ngữ cảnh sử dụng. Khách truy cập và bệnh nhân được cung cấp các trang công khai để tìm kiếm cơ sở khám, chuyên khoa, bác sĩ, gói khám, bài viết sức khỏe và tư vấn triệu chứng bằng AI. Khi đã chọn được thông tin phù hợp, người dùng có thể chuyển sang luồng đặt lịch với các bước rõ ràng.

Đối với bệnh nhân, hệ thống tập trung vào sự dễ hiểu và khả năng theo dõi. Trang lịch hẹn cá nhân phân nhóm lịch theo trạng thái, cho phép xem chi tiết, đổi lịch, hủy lịch, tải phiếu đặt lịch, tải phiếu khám và xem hồ sơ liên quan. Trang hồ sơ khám bệnh giúp bệnh nhân xem lại kết quả sau khám, đơn thuốc, tệp đính kèm, kế hoạch tái khám và tải PDF. Những chức năng này giúp bệnh nhân chủ động hơn trong quá trình chăm sóc sức khỏe.

Đối với bác sĩ, giao diện ưu tiên thao tác nhanh. Các màn hình như dashboard, hàng đợi khám, lịch hẹn và hồ sơ khám được thiết kế để bác sĩ dễ quét thông tin và chuyển trạng thái. Khi bệnh nhân vào khám, bác sĩ có thể cập nhật trạng thái, nhập hồ sơ, kê đơn, đính kèm tệp và khuyến nghị tái khám trong cùng một quy trình. Điều này giúp giảm thao tác rời rạc và hạn chế bỏ sót thông tin sau buổi khám.

Đối với quản trị viên, giao diện tập trung vào quản lý dữ liệu và kiểm soát vận hành. Sidebar quản trị gom các nhóm chức năng như tổng quan, lịch hẹn, hàng đợi khám, lịch làm việc, bác sĩ, tài khoản, cơ sở, chuyên khoa, gói khám, cẩm nang và nhật ký hệ thống. Các bảng dữ liệu có bộ lọc, phân trang, modal thêm/sửa, nút tải PDF và badge trạng thái để quản trị viên xử lý nhanh.

Hệ thống cũng chú trọng đến hiển thị trạng thái bằng màu sắc và nhãn rõ ràng. Các trạng thái lịch như chờ xác nhận, đã xác nhận, đang khám, hoàn thành, đã hủy, không đến khám, yêu cầu hủy và yêu cầu đổi lịch được trình bày nhất quán giữa các màn hình. Nhờ đó, người dùng có thể nhận biết tình trạng lịch mà không cần đọc quá nhiều mô tả.

Một điểm nâng cao trải nghiệm khác là hỗ trợ PDF và AI. PDF giúp bệnh nhân lưu lại phiếu đặt lịch, phiếu số thứ tự và phiếu kết quả khám dưới dạng tài liệu độc lập. AI tư vấn triệu chứng giúp người dùng có thêm gợi ý ban đầu về chuyên khoa phù hợp trước khi đặt lịch. Dù kết quả AI chỉ mang tính tham khảo, chức năng này vẫn tăng tính tiện ích và hiện đại cho hệ thống.

Về giao diện đáp ứng, hệ thống được thiết kế để hoạt động trên nhiều kích thước màn hình. Các màn hình công khai ưu tiên bố cục thân thiện với thiết bị di động, trong khi các màn hình vận hành sử dụng bảng, bộ lọc và vùng cuộn hợp lý để giữ khả năng thao tác trên màn hình lớn. Điều này phù hợp với thực tế người dùng có thể truy cập hệ thống bằng cả điện thoại, máy tính bảng và máy tính cá nhân.

## 5.8. Đóng góp chính của đề tài

Đóng góp đầu tiên của đề tài là xây dựng được một mô hình ứng dụng web tương đối đầy đủ cho quy trình đặt lịch khám bệnh tại phòng khám nhỏ. Hệ thống không chỉ dừng ở việc cho phép bệnh nhân đặt lịch, mà còn mô phỏng được toàn bộ vòng đời của lịch hẹn từ đặt lịch, xác nhận, xử lý hàng đợi, khám bệnh, tạo hồ sơ, tái khám, đánh giá, thông báo và lưu nhật ký.

Đóng góp thứ hai là thiết kế được cơ chế quản lý lịch hẹn theo trạng thái rõ ràng. State machine của lịch hẹn giúp hạn chế thao tác sai, kiểm soát slot, hỗ trợ yêu cầu đổi/hủy lịch và kết nối với các chức năng khác như hàng đợi, danh sách chờ, PDF và thông báo. Đây là phần có giá trị thực tiễn cao vì lịch hẹn là nghiệp vụ trung tâm của hệ thống.

Đóng góp thứ ba là xây dựng được module hồ sơ khám bệnh gắn với tái khám. Hệ thống cho phép bác sĩ nhập dữ liệu chuyên môn, lưu đơn thuốc, tệp đính kèm, lời dặn và kế hoạch tái khám; đồng thời cho phép bệnh nhân xem lại kết quả và đặt lịch tái khám từ hồ sơ cũ. Cách tổ chức này giúp mở rộng hệ thống từ một ứng dụng đặt lịch đơn thuần thành công cụ hỗ trợ quản lý sau khám.

Đóng góp thứ tư là áp dụng phân quyền theo vai trò ở cả backend và frontend. Việc kết hợp JWT, middleware, ProtectedRoute và kiểm tra quyền sở hữu dữ liệu giúp hệ thống bảo vệ các chức năng nhạy cảm. Đây là cơ sở quan trọng để hệ thống có thể vận hành với nhiều nhóm người dùng khác nhau mà vẫn bảo đảm an toàn dữ liệu.

Đóng góp thứ năm là tích hợp các tiện ích hỗ trợ vận hành như thông báo realtime, email, xuất PDF, upload file, AuditLog, dashboard và tư vấn triệu chứng bằng AI. Những tiện ích này giúp hệ thống gần với một sản phẩm thực tế hơn, đồng thời tạo thêm giá trị cho bệnh nhân, bác sĩ và quản trị viên.

Đóng góp thứ sáu là xây dựng được bộ kiểm thử smoke test cho các luồng nghiệp vụ cốt lõi. Kết quả kiểm thử tự động 24/24 luồng đạt yêu cầu cho thấy các chức năng quan trọng đã được xác nhận ở mức cơ bản. Đây là nền tảng để tiếp tục phát triển kiểm thử đơn vị, kiểm thử tích hợp và kiểm thử giao diện trong tương lai.

Bảng dưới đây tóm tắt một số đóng góp nổi bật của đề tài:

| Nhóm đóng góp | Nội dung đạt được | Ý nghĩa |
| --- | --- | --- |
| Nghiệp vụ đặt lịch | Quản lý lịch theo trạng thái, kiểm tra trùng slot, xử lý đổi/hủy lịch | Giúp quy trình đặt lịch rõ ràng và hạn chế sai sót |
| Hàng đợi và danh sách chờ | Cấp số thứ tự, xử lý bệnh nhân đang chờ, mời bệnh nhân khi slot trống | Tăng hiệu quả sử dụng khung giờ khám |
| Hồ sơ khám bệnh | Lưu chẩn đoán, đơn thuốc, sinh hiệu, tệp đính kèm, PDF kết quả | Hỗ trợ quản lý dữ liệu sau khám |
| Tái khám | Liên kết lịch tái khám với hồ sơ gốc, theo dõi trạng thái tái khám | Giúp bệnh nhân và bác sĩ theo dõi quá trình điều trị |
| Phân quyền | JWT, middleware backend, ProtectedRoute frontend | Bảo vệ dữ liệu theo vai trò người dùng |
| Thông báo | MongoDB notification, Socket.IO, email | Cập nhật kịp thời các sự kiện quan trọng |
| Quản trị | Dashboard, quản lý dữ liệu nền, AuditLog | Hỗ trợ kiểm soát vận hành phòng khám |
| Trải nghiệm người dùng | Giao diện theo vai trò, responsive, PDF, AI tư vấn | Tăng tính tiện dụng và khả năng ứng dụng thực tế |

Nhìn chung, đề tài đã hoàn thành mục tiêu xây dựng một hệ thống đặt lịch khám bệnh có tính ứng dụng cho phòng khám nhỏ. Các đóng góp chính không chỉ nằm ở số lượng chức năng đã triển khai, mà còn ở cách tổ chức nghiệp vụ theo quy trình tương đối đầy đủ, có kiểm soát trạng thái, có phân quyền, có thông báo và có dữ liệu phục vụ quản lý sau khám. Đây là cơ sở để hệ thống tiếp tục được hoàn thiện trong các hướng phát triển tiếp theo như thanh toán trực tuyến, nhắc lịch qua SMS/Zalo, telemedicine, báo cáo thống kê nâng cao và triển khai production ổn định hơn.
