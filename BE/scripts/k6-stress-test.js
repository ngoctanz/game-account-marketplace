import http from 'k6/http';
import { check, sleep } from 'k6';

// Cấu hình các kịch bản test
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Tăng dần lên 50 user ảo (Virtual Users - VUs) trong 30 giây đầu
    { duration: '1m', target: 50 },  // Duy trì 50 user ảo này trong 1 phút để test tính ổn định
    { duration: '30s', target: 0 },  // Giảm dần lượng user ảo về 0 trong 30 giây cuối
  ],
  // Ngưỡng thất bại (Thresholds): Nếu vi phạm hệ thống sẽ báo đỏ
  thresholds: {
    http_req_failed: ['rate<0.01'], // Tỉ lệ lỗi phải dưới 1%
    http_req_duration: ['p(95)<500'], // 95% số lượng request phải phản hồi dưới 500ms
  },
};

// Hàm chạy mô phỏng hành vi của 1 user
export default function () {
  const BASE_URL = 'http://localhost:8081/v1';

  // 1. Test kịch bản lấy danh sách account (GET) - Thường là API bị gọi nhiều nhất
  const getAccountsRes = http.get(`${BASE_URL}/accounts`);
  
  check(getAccountsRes, {
    'GET /accounts status là 200': (r) => r.status === 200,
    'Lấy data thành công': (r) => r.json().success === true || r.status === 200,
  });

  // Tạm nghỉ 1 giây để giả lập user thật (đọc web rồi mới click tiếp)
  sleep(1);

  // 2. Test kịch bản đăng nhập (POST) - Thường tốn CPU để check băm mật khẩu / gen JWT
  /*
  const loginPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  });
  const headers = { 'Content-Type': 'application/json' };
  
  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers });
  check(loginRes, {
    'POST /auth/login status là 200': (r) => r.status === 200,
  });
  */
}
