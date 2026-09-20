<p align="center">
  <img src="./apps/webapp/public/static/images/casla-logo.svg" alt="Casla Assets" width="300" />
</p>

<h1 align="center">Casla Assets</h1>

<p align="center">
  Hệ thống quản lý tài sản nội bộ dành cho Casla.
</p>

<p align="center">
  <a href="https://github.com/nguyenduckhiem1002-dot/DATN/actions/workflows/test.yml">
    <img src="https://github.com/nguyenduckhiem1002-dot/DATN/actions/workflows/test.yml/badge.svg" alt="Tests" />
  </a>
  <a href="https://github.com/nguyenduckhiem1002-dot/DATN/actions/workflows/casla-branding.yml">
    <img src="https://github.com/nguyenduckhiem1002-dot/DATN/actions/workflows/casla-branding.yml/badge.svg" alt="Casla Branding" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="AGPL-3.0" />
  </a>
</p>

---

## Giới thiệu

**Casla Assets** là hệ thống quản lý tài sản được tùy biến để sử dụng trong nội bộ Casla, phát triển dựa trên mã nguồn mở [Shelf.nu](https://github.com/Shelf-nu/shelf.nu).

Mục tiêu của dự án là tập trung thông tin tài sản vào một hệ thống thống nhất, giúp theo dõi tài sản đang ở đâu, thuộc danh mục nào, ai đang sử dụng, lịch bàn giao/hoàn trả và lịch sử thay đổi.

Giao diện của bản Casla được ưu tiên **Tiếng Việt** và sử dụng bộ nhận diện Casla.

## Chức năng chính

- **Quản lý tài sản** — tạo, cập nhật, tìm kiếm, lọc và theo dõi tài sản.
- **Mã QR / Barcode** — quét mã để truy cập nhanh thông tin tài sản.
- **Vị trí** — quản lý tài sản theo kho, phòng, khu vực hoặc địa điểm.
- **Bàn giao / người giữ tài sản** — theo dõi tài sản đang được giao cho ai.
- **Đặt lịch** — lên lịch sử dụng, bàn giao và nhận lại thiết bị.
- **Bộ tài sản** — gom nhiều tài sản thành một bộ để quản lý cùng nhau.
- **Danh mục và thẻ** — phân loại tài sản linh hoạt.
- **Kiểm kê** — hỗ trợ quy trình kiểm kê và đối chiếu tài sản.
- **Nhắc việc** — theo dõi bảo trì, bảo hành và các mốc cần xử lý.
- **Báo cáo** — tổng hợp dữ liệu tài sản và lịch sử hoạt động.
- **Phân quyền** — quản lý quyền truy cập theo người dùng và vai trò.
- **Import / Export CSV** — nhập và xuất dữ liệu hàng loạt.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend / Web | React 19, React Router 7 |
| Ngôn ngữ | TypeScript |
| Build | Vite, Turborepo |
| Package manager | pnpm |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication / Storage | Supabase |
| UI | Tailwind CSS, Radix UI |
| Test | Vitest, Playwright |
| Mobile companion | React Native / Expo |

## Yêu cầu phát triển

- Node.js **>= 22.20.0**
- pnpm **9.15.9**
- PostgreSQL / Supabase phù hợp với cấu hình môi trường của dự án

## Chạy dự án local

```bash
git clone https://github.com/nguyenduckhiem1002-dot/DATN.git
cd DATN

pnpm install

cp .env.example .env

pnpm webapp:setup
pnpm webapp:dev
```

Ứng dụng development mặc định chạy tại:

```text
https://localhost:3000
```

> File `.env` cần được cấu hình đúng database, Supabase và các dịch vụ liên quan trước khi chạy đầy đủ ứng dụng.

## Các lệnh thường dùng

| Lệnh | Chức năng |
| --- | --- |
| `pnpm webapp:dev` | Chạy web app ở development |
| `pnpm webapp:build` | Build web app |
| `pnpm webapp:validate` | Prisma generate + test + lint + typecheck |
| `pnpm webapp:test` | Chạy Vitest |
| `pnpm webapp:lint` | Chạy ESLint |
| `pnpm typecheck` | Kiểm tra TypeScript |
| `pnpm webapp:setup` | Generate Prisma client và chạy migration |
| `pnpm db:deploy-migration` | Apply migration |
| `pnpm db:reset` | Reset database — **xóa dữ liệu** |

## Cấu trúc chính

```text
DATN/
├── apps/
│   ├── webapp/              # Ứng dụng Casla Assets trên web
│   ├── companion/           # Ứng dụng mobile companion
│   └── docs/                # Tài liệu từ upstream
├── packages/
│   ├── database/            # Prisma schema, migrations
│   └── ...                  # Các package dùng chung
├── .github/
│   └── workflows/           # GitHub Actions
└── CASLA_CUSTOMIZATION.md   # Ghi chú tùy biến Casla
```

### Vì sao vẫn còn tên `@shelf/*` trong code?

Một số package, biến nội bộ và cấu trúc kỹ thuật vẫn giữ tên từ upstream như `@shelf/webapp` hoặc `@shelf/database`.

Đây là quyết định có chủ đích để giảm rủi ro làm hỏng dependency graph, migration, import path và khả năng đồng bộ các bản vá từ upstream. Tên hiển thị cho người dùng được đổi sang **Casla Assets**; việc đổi namespace nội bộ có thể thực hiện sau nếu thật sự cần thiết.

## GitHub Actions

Repository có hai lớp kiểm tra chính:

1. **Test workflow** — lint, TypeScript, Vitest và test các workspace package trên Pull Request.
2. **Casla Assets Brand Guard** — kiểm tra logo, tên thương hiệu và locale Casla để tránh các thay đổi upstream vô tình đưa branding Shelf trở lại.

Không commit secret hoặc nội dung `.env` lên repository. Các secret dùng cho deploy/E2E phải cấu hình bằng **GitHub Actions Secrets / Environments**.

## Triển khai nội bộ

Casla Assets có thể được triển khai trong hạ tầng nội bộ, nhưng kiến trúc hiện tại vẫn kế thừa Shelf.nu và sử dụng PostgreSQL/Supabase cho một số thành phần.

Nếu triển khai hoàn toàn on-premise, cần đánh giá riêng:

- PostgreSQL
- Authentication
- Object storage
- SMTP
- Backup database
- Reverse proxy / HTTPS
- Quản lý secret
- Chiến lược cập nhật từ upstream

## Tùy biến Casla

Các thay đổi đặc thù Casla được ghi trong [CASLA_CUSTOMIZATION.md](./CASLA_CUSTOMIZATION.md).

Logo ứng dụng:

- `apps/webapp/public/static/images/casla-logo.svg`
- `apps/webapp/public/static/images/casla-logo-white.svg`

Locale mặc định: **vi-VN**.

## Nguồn gốc và giấy phép

Dự án này được phát triển dựa trên:

- Upstream: [Shelf.nu](https://github.com/Shelf-nu/shelf.nu)
- License: **GNU Affero General Public License v3.0 (AGPL-3.0)**

Casla Assets tiếp tục tuân thủ các điều khoản áp dụng của AGPL-3.0. Không xóa file [LICENSE](./LICENSE) hoặc các thông báo bản quyền bắt buộc của upstream.

Việc sử dụng nội bộ hoặc không nhằm mục đích thương mại không tự động loại bỏ các nghĩa vụ của AGPL-3.0.
