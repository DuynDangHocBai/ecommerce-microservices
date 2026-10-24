---
trigger: always_on
---

# Project Rules – Ecommerce MVP Microservices

Nguồn sự thật: @../../docs/design-spec.md và các ảnh trong thư mục docs/. Không tự thêm tính năng ngoài spec.

## Cách làm việc
- Chỉ làm ĐÚNG phạm vi của bước được yêu cầu trong prompt hiện tại. Không làm trước bước sau.
- Tạo Implementation Plan ngắn trước khi code, sau đó tự thực hiện, không cần chờ duyệt
  (trừ khi gặp mâu thuẫn với spec hoặc cần lệnh bị cấm).
- Kết thúc mỗi bước: liệt kê file đã tạo/sửa, lệnh để tôi tự kiểm tra, và kết quả lệnh kiểm tra đã chạy.
- Giải thích ngắn gọn bằng tiếng Việt; tên biến, code, comment bằng tiếng Anh.
- Không xóa/ghi đè file ngoài thư mục của service đang làm nếu không được yêu cầu.

## Stack bắt buộc
- Node.js 20 LTS, JavaScript CommonJS, Express 4.
- PostgreSQL: Prisma ORM phiên bản 6.x (KHÔNG dùng Prisma 7); mỗi service có schema.prisma + migration riêng.
- MongoDB: Mongoose.
- gRPC: @grpc/grpc-js + @grpc/proto-loader, file .proto đặt trong thư mục `proto/` ở root.
- Kafka: kafkajs. Redis: ioredis. JWT: jsonwebtoken. Hash: bcryptjs (KHÔNG dùng bcrypt). Validation: joi.
- Logging: morgan (HTTP) + console có prefix tên service.

## Cấu trúc repo
ecommerce-microservices/
├── docs/
├── proto/ # customer.proto, product.proto
├── api-gateway/
├── auth-service/
├── customer-service/
├── product-service/
├── order-service/
├── shipment-service/
├── docker-compose.yml
├── .env.example
└── README.md
Mỗi service: `src/` chia lớp theo DDD đơn giản: `domain/` (entity, rule nghiệp vụ), `application/` (use case/service), `infrastructure/` (db, grpc, kafka), `interfaces/` (http routes, controllers, grpc handlers); có `package.json`, `.env.example`, `GET /health`. Dockerfile và `.dockerignore` chỉ tạo ở Bước 10.

## Port
- Port ứng dụng (khi chạy bằng Node trên máy, Bước 2–9): gateway 4100, auth 4101, customer 4102 (gRPC 50052), product 4103 (gRPC 50053), order 4104, shipment 4105. KHÔNG dùng 3000, 3001, 5433, 8080, 27017 (dự án khác đang dùng).
- Hạ tầng đang chạy bằng Docker, service trên máy kết nối qua PORT HOST:
  auth-db localhost:15433, customer-db localhost:15434, order-db localhost:15435,
  product-db localhost:37018, shipment-db localhost:37019, redis localhost:16379, kafka localhost:19092.
- Trong Docker network (Bước 10): dùng tên container và port nội bộ (auth-db:5432, product-db:27017, redis:6379, kafka:29092).
- Gateway publish ra host port 18080 khi chạy compose đầy đủ. Các port 3000, 3001, 8080 trên host đã bị dự án khác dùng.
- User/password/database của từng DB lấy từ file `.env` ở root.

## Quy ước
- Database-per-Service: service KHÔNG đọc DB của service khác; chỉ gọi qua gRPC/Kafka.
- Cấu hình qua biến môi trường, không hard-code secret. Cập nhật `.env.example` khi thêm biến.
- Mã lỗi HTTP đúng spec (400/401/403/404/409/503). Response lỗi dạng `{ "error": "<message>" }`.
- Service nội bộ tin header `x-user-id`, `x-user-role` do Gateway gắn.

## Lệnh bị cấm (tuyệt đối không chạy)
- Bất kỳ lệnh docker / docker compose nào.
- rm -rf, Remove-Item -Recurse, git push, git reset, git clean, npx prisma migrate reset.
- Lệnh chờ vô hạn: `logs -f`, `tail -f`, server chạy ở foreground rồi chờ, vòng lặp sleep không giới hạn.
  Khi cần thử server: chạy nền, gọi thử, rồi tắt.
- Nếu cần một lệnh trong danh sách này, DỪNG lại và hỏi tôi.