---
trigger: always_on
---

# Project Rules – Ecommerce MVP Microservices

Nguồn sự thật: @../../docs/design-spec.md và các ảnh trong thư mục docs/. Không tự thêm tính năng ngoài spec.

## Cách làm việc
- Chỉ làm ĐÚNG phạm vi của bước được yêu cầu trong prompt hiện tại. Không làm trước bước sau.
- Luôn tạo Implementation Plan trước khi code, chờ tôi duyệt.
- Kết thúc mỗi bước: liệt kê file đã tạo/sửa, lệnh để tôi tự kiểm tra, và kết quả lệnh kiểm tra đã chạy.
- Giải thích ngắn gọn bằng tiếng Việt; tên biến, code, comment bằng tiếng Anh.
- Không xóa/ghi đè file ngoài thư mục của service đang làm nếu không được yêu cầu.

## Stack bắt buộc
- Node.js 20 LTS, JavaScript CommonJS, Express 4.
- PostgreSQL: Prisma ORM (mỗi service có schema.prisma + migration riêng).
- MongoDB: Mongoose.
- gRPC: @grpc/grpc-js + @grpc/proto-loader, file .proto đặt trong thư mục `proto/` ở root.
- Kafka: kafkajs. Redis: ioredis. JWT: jsonwebtoken. Hash: bcrypt. Validation: joi hoặc zod.
- Logging: morgan (HTTP) + console có prefix tên service.

## Cấu trúc repo
```
ecommerce-microservices/
├── docs/
├── proto/                 # customer.proto, product.proto
├── api-gateway/
├── auth-service/
├── customer-service/
├── product-service/
├── order-service/
├── shipment-service/
├── docker-compose.yml
├── .env.example
└── README.md
```
Mỗi service: `src/` chia lớp theo DDD đơn giản: `domain/` (entity, rule nghiệp vụ), `application/` (use case/service), `infrastructure/` (db, grpc, kafka), `interfaces/` (http routes, controllers, grpc handlers); có `Dockerfile`, `.dockerignore`, `package.json`, `GET /health`.

## Quy ước
- Database-per-Service: service KHÔNG đọc DB của service khác; chỉ gọi qua gRPC/Kafka.
- Cấu hình qua biến môi trường, không hard-code secret. Cập nhật `.env.example` khi thêm biến.
- Mã lỗi HTTP đúng spec (400/401/403/404/409/503). Response lỗi dạng `{ "error": "<message>" }`.
- Service nội bộ tin header `x-user-id`, `x-user-role` do Gateway gắn; chỉ Gateway expose port ra ngoài khi chạy compose đầy đủ.
- Port mặc định: gateway 3000, auth 3001, customer 3002 (gRPC 50052), product 3003 (gRPC 50053), order 3004, shipment 3005.
