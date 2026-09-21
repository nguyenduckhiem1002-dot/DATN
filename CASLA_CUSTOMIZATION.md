# Casla Assets

Casla Assets là bản tùy biến nội bộ của hệ thống quản lý tài sản dựa trên Shelf.nu.

- Thương hiệu ứng dụng: **Casla Assets**
- Ngôn ngữ giao diện mục tiêu: **Tiếng Việt**
- Locale mặc định: **vi-VN**
- Logo: lấy từ repository `Android-App-Casla` của Casla.
- Upstream: https://github.com/Shelf-nu/shelf.nu
- Giấy phép upstream: **GNU AGPL v3**

## Lưu ý giấy phép

Việc sử dụng nội bộ hoặc phi thương mại không làm mất hiệu lực của AGPL-3.0.
Các thông báo bản quyền và file LICENSE của upstream cần được giữ nguyên theo giấy phép.


## Chế độ nội bộ Casla

Bản Casla Assets bật `internalMode` để bỏ các bề mặt SaaS không cần thiết như
cửa hàng Shelf, cập nhật sản phẩm, feedback widget, Stripe/subscription gate,
Crisp và analytics bên thứ ba. Các chức năng nghiệp vụ quản lý tài sản vẫn giữ
nguyên.

Logo sidebar dùng bản SVG đã crop khoảng trắng để nhận diện rõ hơn; favicon/tab
browser dùng Casla mark riêng.

## Tài khoản test local

Có thể tạo/repair tài khoản test local bằng:

```bash
pnpm --filter @shelf/webapp seed:casla-user
```

Email mặc định là `ducknguyen1010@gmail.com`. Mật khẩu **không được lưu trong
Git**; đặt `CASLA_TEST_USER_PASSWORD` trong file `.env` local trước khi chạy
seeder. Seeder chỉ chạy ngoài production và tạo một TEAM workspace
`Casla Assets` dùng VND.
