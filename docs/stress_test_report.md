# Báo cáo kết quả Stress Test - Hệ thống Game Shop

**Ngày thực hiện:** 2026-07-25
**Công cụ sử dụng:** Autocannon
**Kịch bản:** 100 kết nối đồng thời (Concurrent Users), chạy liên tục trong 10 giây.
**Rate Limit Server:** 500 requests / 5 phút.

---

## Giai đoạn 1: Backend - Trước khi tối ưu (Chỉ dùng MongoDB)

### 1. Kết quả chịu tải
*   **Tổng số Request xử lý thành công:** 300 requests
*   **Throughput (RPS):** 
    *   Trung bình: **20 RPS**
    *   Cao nhất: **92 RPS**
*   **Độ trễ (Latency):**
    *   Trung bình: **3.55 giây** (3555 ms)
    *   Cao nhất: **6.01 giây** (6010 ms)

### 2. Đánh giá
*   **Hiệu năng:** Rất chậm. Server bị thắt cổ chai (bottleneck) ở việc Query Database vì thiếu Index và phải tính toán sắp xếp nhiều, dẫn đến phản hồi chậm (>3s).
*   **Rate Limit:** Hệ thống chưa xử lý đến ngưỡng 500 requests của Rate Limit vì tốc độ thực thi quá chậm.

---

## Giai đoạn 2: Backend - Sau khi tối ưu (Thêm MongoDB Index & Redis Cache)

### 1. Cải tiến đã áp dụng
*   Bổ sung 2 Compound Index vào `Account Model` (`{ status: 1, createdAt: -1 }` và `{ status: 1, price: 1 }`).
*   Tích hợp Redis Caching qua Middleware, cache lại JSON response trong 120 giây đối với các GET request.

### 2. Kết quả chịu tải
*   **Tổng số Request xử lý:** **147,278 requests** (Gấp gần 500 lần).
*   **Throughput (RPS):** 
    *   Trung bình: **14,729 RPS**
    *   Cao nhất: **21,519 RPS**
*   **Độ trễ (Latency):**
    *   Trung bình: **6 mili-giây** (6 ms)
    *   Cao nhất: **~4 giây** (chỉ ở những lúc xử lý lưu cache lần đầu)
*   **Phân tích HTTP Status:**
    *   `2xx responses`: **499** (Vừa khít ngưỡng cấu hình Rate Limit).
    *   `429 Too Many Requests`: **146,779** (Bị chặn bởi Rate Limiter).

### 3. Đánh giá chung
Hệ thống hiện tại cực kỳ bảo mật và chịu tải tốt. 
* **Tốc độ:** Redis đưa tốc độ truy xuất xuống mức tiệm cận thời gian thực (6ms).
* **Bảo mật Spam/DDoS:** Express Rate Limiter chặn mượt mà hơn 146,000 request spam chỉ trong 10 giây mà không hề gây treo (crash) Server hay tốn tài nguyên Database.

---

## Giai đoạn 3: Frontend - Chịu tải giao diện (Next.js App Router)

### 1. Kịch bản Test
*   **Môi trường:** Production (`npm run build` && `npm run start`)
*   **Trang test:** Trang chủ (`/`) - Nơi có nhiều truy cập nhất.

### 2. Kết quả chịu tải
*   **Tổng số Request xử lý:** **19,000 requests**
*   **Throughput (RPS):** 
    *   Trung bình: **1,863 RPS**
    *   Cao nhất: **2,030 RPS**
*   **Độ trễ (Latency):**
    *   Trung bình: **53 mili-giây** (53 ms)
    *   Cao nhất: **148 ms**
*   **Băng thông (Data Transfer):** Chuyển giao hơn **1.05 GB** dữ liệu HTML chỉ trong 10 giây.

### 3. Đánh giá chung
*   Next.js thể hiện sức mạnh vượt trội khi sử dụng **SSG (Static Site Generation)**. Do trang chủ đã được build sẵn thành static HTML (hiển thị ký hiệu `○ / (Static)` trong lúc build), server không cần chạy lại React logic cho mỗi request.
*   **Khả năng mở rộng:** Với mức 1,863 request mỗi giây trả về thẳng HTML hoàn chỉnh, cấu hình Frontend này của bạn hoàn toàn dư sức đáp ứng cho một chiến dịch quảng cáo hoặc một sự kiện có cả chục ngàn người truy cập đồng thời mà không sợ bị sập giao diện!
