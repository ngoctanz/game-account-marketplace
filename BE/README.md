# Game Account Shop - Backend API

REST API bán tài khoản game với bảo mật đa lớp.

## 🚀 Tech Stack

- **Framework**: Express.js 5
- **Database**: MongoDB + Mongoose 8.16
- **Authentication**: JWT (Access Token + Refresh Token HTTP-only Cookie)
- **Validation**: Joi
- **Security**: Helmet, Rate Limiting, Sanitization, Audit Logging, Token Blacklist

## 📂 Kiến Trúc Dự Án

```
src/
├── config/                 # Cấu hình
├── models/                 # Mongoose models (12 collections)
│   ├── user.model.js
│   ├── user-token.model.js
│   ├── account.model.js        # Game accounts (credentials: select: false)
│   ├── account-type.model.js
│   ├── order.model.js          # Có accountCredentials cho buyer
│   ├── cart.model.js
│   ├── transaction.model.js
│   ├── payment-method.model.js
│   ├── notification.model.js
│   ├── audit-log.model.js      # Lưu lịch sử hoạt động (90 ngày)
│   └── token-blacklist.model.js # Revoked tokens
├── controllers/            # Controllers (xử lý request/response)
├── services/               # Business logic
├── middlewares/            # Middlewares
│   ├── authenticate.middleware.js   # Verify JWT + check blacklist
│   ├── authorize.middleware.js      # Check roles
│   ├── rate-limit.middleware.js     # 4 loại rate limiters
│   ├── security-headers.middleware.js  # Helmet
│   ├── sanitize.middleware.js       # NoSQL injection, XSS, HPP
│   └── request-logger.middleware.js # Request tracking
├── routes/                 # API routes
├── services/
│   ├── audit.service.js    # Audit logging helpers
│   └── token-blacklist.service.js
├── utils/                  # Utilities
├── validations/            # Joi schemas
└── server.js               # Entry point
```

## Installation

```bash
cd BE
npm install
cp .env.example .env
# Update .env with your configuration
npm run dev
```

## Environment Variables

Create a `.env` file:

```env
NODE_ENV=development
APP_HOST=localhost
APP_PORT=3001

MONGODB_URI=mongodb://localhost:27017/game-account-shop?replicaSet=rs0

JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
```

Purchase flow dùng MongoDB transactions, vì vậy database phải là Replica Set,
sharded cluster hoặc MongoDB Atlas; standalone MongoDB không được hỗ trợ.

## API Endpoints

### Authentication

- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login (returns accessToken + sets refreshToken cookie)
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/logout` - Logout
- `GET /v1/auth/me` - Get current user

### Users

- `GET /v1/users` - Get all users (Admin)
- `GET /v1/users/:id` - Get user by ID
- `PATCH /v1/users/:id` - Update user
- `PATCH /v1/users/:id/balance` - Update balance (Admin)

### Accounts

- `GET /v1/accounts` - Danh sách accounts (KHÔNG có credentials)
- `GET /v1/accounts/:id` - Chi tiết account (KHÔNG có credentials)
- `GET /v1/accounts/:id/credentials` - 🔒 Xem credentials (Admin only, rate limited 3/hour)
- `POST /v1/accounts` - Tạo account (Admin)
- `PATCH /v1/accounts/:id` - Cập nhật account (Admin)
- `DELETE /v1/accounts/:id` - Xóa account (Admin)
- `POST /v1/accounts/:id/purchase` - Mua account (rate limited 5/min)

### Categories

- `GET /v1/categories` - Danh sách danh mục
- `GET /v1/categories/:id` - Chi tiết danh mục
- `POST /v1/categories` - Tạo danh mục (Admin)
- `PATCH /v1/categories/:id` - Cập nhật danh mục (Admin)
- `DELETE /v1/categories/:id` - Xóa danh mục (Admin)

### Account Types

- `GET /v1/account-types` - Danh sách loại tài khoản
- `GET /v1/account-types/:id` - Chi tiết loại tài khoản
- `GET /v1/account-types/category/:categoryId` - Danh sách theo danh mục
- `POST /v1/account-types` - Tạo loại tài khoản (Admin)
- `PATCH /v1/account-types/:id` - Cập nhật loại tài khoản (Admin)
- `DELETE /v1/account-types/:id` - Xóa loại tài khoản (Admin)

### Cart

- `GET /v1/cart` - Get user's cart
- `POST /v1/cart/items` - Add item to cart
- `DELETE /v1/cart/items/:accountId` - Remove item
- `DELETE /v1/cart/clear` - Clear cart

### Transactions

- `GET /v1/transactions` - Get transactions
- `GET /v1/transactions/:id` - Get transaction by ID

### Notifications

- `GET /v1/notifications` - Get notifications
- `GET /v1/notifications/unread-count` - Get unread count
- `GET /v1/notifications/:id` - Get by ID
- `PATCH /v1/notifications/:id/read` - Mark as read
- `PATCH /v1/notifications/read-all` - Mark all as read

## 🔐 Bảo Mật Đa Lớp

### 1. HTTP Security Headers (Helmet)

- CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- Chống clickjacking, MIME sniffing

### 2. Rate Limiting

- **API thường**: 100 requests/15 phút
- **Auth (login/register)**: 5 attempts/15 phút
- **Purchase**: 5 requests/phút
- **Sensitive ops** (xem credentials): 3 requests/giờ

### 3. Data Sanitization

- **NoSQL Injection**: Chặn `$` operators
- **XSS**: Escape HTML/script tags
- **HPP**: Chống HTTP Parameter Pollution

### 4. JWT Authentication

- **Access Token**: 15 phút, trả về response body
- **Refresh Token**: 7 ngày, HTTP-only cookie (không đọc được bằng JS)
- **Token Blacklist**: Revoke token khi logout/ban user

### 5. Audit Logging

Tự động ghi lại:

- Login/Logout (thành công & thất bại)
- Register
- Purchase (mua tài khoản)
- Credential Access (admin xem mật khẩu game)
- Token Refresh
- Suspicious Activity

Logs tự động xóa sau 90 ngày.

### 6. Game Account Credentials Security

**🔒 Bảo mật tuyệt đối cho tài khoản game:**

1. **Public APIs** (`GET /accounts`, `GET /accounts/:id`):

   - **KHÔNG BAO GIỜ** trả về `username`, `password` của game
   - Chỉ hiển thị thông tin: tên, giá, rank, hình ảnh

2. **Admin xem credentials** (`GET /accounts/:id/credentials`):

   - Chỉ admin được phép
   - Rate limit: 3 lần/giờ
   - Ghi audit log mỗi lần xem

3. **Buyer xem credentials**:
   - Sau khi mua, credentials được **copy vào Order**
   - Buyer chỉ xem được qua Order của mình
   - Không thể xem trực tiếp từ Account

**Cơ chế:**

```javascript
// account.model.js
credentials: {
  username: { type: String, select: false },  // Không query được
  password: { type: String, select: false },  // Phải dùng .select('+credentials')
  additionalInfo: { type: String, select: false }
}

// Khi purchase → copy vào Order
accountCredentials: {
  username: account.credentials.username,
  password: account.credentials.password,
  // ... buyer sở hữu mãi mãi
}
```

### 7. CORS

- Chỉ cho phép frontend domain
- Credentials: true (gửi cookie)

## Response Format

### Success

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

### Error

```json
{
  "success": false,
  "message": "Error message"
}
```

### Paginated

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

🎯 Tổng Kết Những Gì Đã Làm

### ✅ Backend Architecture

1. **Refactor hoàn toàn BE** theo chuẩn Controller → Service → Model
2. **12 Mongoose Models** đầy đủ cho toàn bộ hệ thống
3. **Clean code**: Bỏ comments thừa, logs không cần thiết
4. **Validation**: Joi schemas cho tất cả endpoints

### ✅ Security Implementation

1. **9-layer security middleware stack**:

   - Helmet security headers
   - CORS với credentials
   - Rate limiting (4 loại limiters)
   - Request ID tracking (UUID)
   - NoSQL injection protection
   - XSS sanitization
   - HTTP Parameter Pollution protection
   - Body size limits (10kb)
   - Token blacklist checking

2. **Game Credentials Protection**:

   - `select: false` trong Mongoose schema
   - Không bao giờ expose qua public APIs
   - Admin xem qua endpoint riêng (rate limited)
   - Buyer nhận credentials qua Order sau khi mua

3. **Token Security**:

   - Access token: 15 phút (response body)
   - Refresh token: 7 ngày (HTTP-only cookie)
   - Blacklist revoked tokens
   - Auto-check blacklist trước khi authenticate

4. **Audit Logging**:
   - Ghi lại mọi hoạt động quan trọng
   - Auto-delete sau 90 ngày
   - Track IP, UserAgent, RequestId

### 🚀 Ready for Production

- Clean, maintainable code
- Enterprise-grade security
- Full audit trail
- Scalable architecture

##

## License

MIT
