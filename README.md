# ShopAcc — Digital Account Commerce Demo

Full-stack demo mô phỏng một nền tảng quản lý và phân phối tài khoản game. Dự án được xây dựng để học tập, trình diễn kỹ thuật và sử dụng trong portfolio.

## Tuyên bố miễn trừ trách nhiệm

Dự án từng được triển khai và vận hành thực tế như một hệ thống thương mại điện tử kinh doanh tài khoản trò chơi. Tuy nhiên, do thay đổi của các quy định pháp luật có liên quan, dự án đã ngừng kinh doanh và không còn cung cấp dịch vụ cho người dùng.

Phiên bản mã nguồn hiện tại chỉ được lưu trữ nhằm mục đích học tập, nghiên cứu, trình diễn kỹ thuật và sử dụng trong portfolio. Các chức năng thanh toán, tích hợp dịch vụ bên thứ ba và dữ liệu nhạy cảm đã được loại bỏ hoặc vô hiệu hóa. Toàn bộ sản phẩm, tài khoản, giá bán, giao dịch và thông tin còn hiển thị đều là dữ liệu mô phỏng; hệ thống không tiếp nhận thanh toán hoặc phát sinh hoạt động mua bán thực tế.

Các tên thương hiệu, hình ảnh, trò chơi hoặc nhãn hiệu xuất hiện trong dự án, nếu có, thuộc quyền sở hữu của các tổ chức và cá nhân tương ứng; việc sử dụng chỉ nhằm mục đích minh họa, học tập và phi thương mại.

## Demo

### Trang chủ

![Trang chủ ShopAcc](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-50-37.png)

### Giao diện theo mùa và dark mode

| Tết | Trung thu |
| --- | --- |
| ![Giao diện Tết](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-50-44.png) | ![Giao diện Trung thu](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-51-06.png) |

### Mua tài khoản

![Chi tiết tài khoản](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-52-03.png)

### Quản trị

![Dashboard quản trị](FE/public/images/demo/Screenshot%20From%202026-07-24%2016-52-26.png)

## Chức năng

### Người dùng

- Đăng ký, đăng nhập và quản lý hồ sơ.
- Xem danh mục, package và chi tiết tài khoản.
- Tìm kiếm, lọc, phân trang và lưu danh sách yêu thích.
- Mô phỏng mua tài khoản theo ba chế độ:
  - `LIST`: chọn tài khoản cụ thể.
  - `RANDOM`: nhận ngẫu nhiên một tài khoản trong package.
  - `CLONE`: chọn số lượng từ một kho credential.
- Xem lịch sử mua và thông tin tài khoản demo đã nhận.
- Xem thông báo hệ thống và giao diện theo mùa.

### Quản trị

- Quản lý người dùng, danh mục, package và tài khoản.
- Nhập tài khoản hàng loạt.
- Quản lý đơn hàng, giảm giá, thông báo và audit log.
- Theo dõi dashboard, doanh thu mô phỏng và trạng thái inventory.
- Cleanup dữ liệu/media cũ theo batch và lịch chạy định kỳ.

### Kỹ thuật nổi bật

- Conditional atomic updates chống bán trùng khi có request đồng thời.
- Compensating rollback phục hồi inventory và số dư khi purchase flow thất bại.
- JWT access/refresh token, HTTP-only cookie, token revocation và RBAC.
- Bcrypt, Joi validation, Helmet, rate limiting, sanitization và audit logging.
- Mongoose field projection giới hạn truy cập credential.
- Compound indexes, pagination, `insertMany`, `bulkWrite` và Cloudinary CDN.
- Next.js ISR/cache, optimized images và responsive admin dashboard.

## Hiệu năng (Stress Testing)

Dự án đã được kiểm thử chịu tải thực tế bằng công cụ **Autocannon** với cấu hình **100 kết nối đồng thời** chạy liên tục trong 10 giây.

### 1. Phương pháp & Công cụ
- **Công cụ Test:** `autocannon` & `k6`.
- **Mục tiêu:** Đo lường Throughput (Số request mỗi giây - RPS) và Latency (Độ trễ).

### 2. Kết quả Backend (Express.js + MongoDB + Redis)
- **Tối ưu:** Đã thêm Compound Index cho MongoDB và tích hợp Redis Caching qua Middleware (`120s`).
- **Throughput:** Trung bình **14,700 RPS** (Đỉnh điểm: 21,500 RPS).
- **Latency:** Trung bình **6ms**.
- **Bảo mật Spam:** Express Rate Limiter (500 req/5m) hoạt động mượt mà, chặn thành công hơn 146,000 request spam (DDoS) chỉ trong 10 giây mà không gây treo (crash) Server.

### 3. Kết quả Frontend (Next.js)
- **Cơ chế:** Test trên giao diện Production (App Router - `SSG`).
- **Throughput:** Trung bình **1,863 RPS**.
- **Latency:** Trung bình **53ms**.
- **Băng thông:** Next.js đáp ứng tĩnh (static) cực tốt, chuyển giao hơn 1.05 GB dữ liệu HTML chỉ trong 10 giây.

> 📝 **Báo cáo chi tiết có thể xem tại:** [docs/stress_test_report.md](docs/stress_test_report.md).

## Những phần đã lược bỏ

Để repository có thể public an toàn, bản demo đã xoá:

- Cổng thanh toán, nạp thẻ và webhook xử lý tiền thật.
- PayOS và các tích hợp nhà cung cấp thanh toán.
- WebSocket và các cập nhật thời gian thực.
- Thông tin liên hệ, mạng xã hội và QR cá nhân.
- Credential, API key và cấu hình production.

Các route giao diện liên quan chỉ hiển thị thông báo demo.

## Công nghệ

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, TanStack Query.
- Backend: Node.js, Express.js 5, MongoDB, Mongoose.
- Security: JWT, bcrypt, Joi, Helmet, rate limiting.
- Media: Cloudinary.

## Tài khoản demo

| Quyền | Email | Mật khẩu |
| --- | --- | --- |
| User | `test@gmail.com` | `12345678` |
| Admin | `admin@gmail.com` | `12345678` |

Chỉ sử dụng các thông tin này với database demo.

## Chạy local

Yêu cầu Node.js `20.9+`, npm và MongoDB.

### Backend

```bash
cd BE
cp .env.example .env
npm install
npm run dev
```

Cập nhật `BE/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/shop-game-demo
JWT_ACCESS_SECRET=replace-with-a-random-secret
JWT_REFRESH_SECRET=replace-with-another-random-secret
FRONTEND_URL=http://localhost:3000
```

### Frontend

```bash
cd FE
npm install
npm run dev
```

Tạo `FE/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=30000
```

Frontend chạy tại `http://localhost:3000`, backend mặc định tại `http://localhost:3001`.

## Thông số frontend

| Hạng mục | Giá trị mặc định |
| --- | --- |
| Frontend port | `3000` |
| Backend API port | `3001` |
| API timeout | `30 giây` |
| Số bản ghi mỗi trang | `20` |
| Tùy chọn số bản ghi | `10`, `20`, `50`, `100` |
| Ảnh hỗ trợ | JPEG, PNG, WebP |
| Kích thước ảnh tối đa | `5 MB` |
| Build output | Next.js standalone |

## Kiểm tra và build

```bash
cd FE
npm run check
npm run build
npm start
```

## Cấu trúc

```text
.
├── FE/   # Next.js application
└── BE/   # Express REST API
```

## Tác giả

Demo by `ngoctanz`.
