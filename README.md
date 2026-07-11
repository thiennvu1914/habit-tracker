# Thiên Vũ — Personal Habit System

Website theo dõi thói quen cá nhân lấy cảm hứng từ dashboard trong video tham chiếu. Dữ liệu được lưu bằng `localStorage`, vì vậy ứng dụng chạy local và không cần tài khoản hay cơ sở dữ liệu.

## Chạy local

Yêu cầu: Node.js 22.13 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ được hiển thị trong terminal (thông thường là `http://localhost:5173`).

Trên Windows, bạn cũng có thể nhấp đúp `run-local.bat`. Lần chạy đầu tiên sẽ tự cài các gói cần thiết rồi mở máy chủ local.

## Chức năng

- Theo dõi tối đa 20 thói quen theo từng ngày trong tháng
- Lịch riêng cho từng thói quen: mỗi ngày, ngày được chọn, X lần/tuần hoặc ngày cụ thể
- Trang Hôm nay chỉ hiển thị việc đến hạn và mục tiêu tuần còn thiếu
- Nghỉ hợp lệ hoặc dời lịch sang ngày khác trong cùng tuần
- Thay đổi lịch từ hôm nay mà vẫn giữ nguyên dữ liệu cũ
- Thêm, sửa, xóa thói quen và chuyển tháng
- Biểu đồ tiến độ hằng ngày, phân tích từng thói quen và bảng xếp hạng
- Tiến độ tính theo số lần thực sự được lên lịch; chuỗi thành tích tính theo tuần
- Ghi nhận mức năng lượng 1–5
- Xuất dữ liệu tháng ra CSV
- Tự động lưu trên trình duyệt, hỗ trợ desktop và mobile

## Bản production local

```bash
npm run build
npm run start
```
