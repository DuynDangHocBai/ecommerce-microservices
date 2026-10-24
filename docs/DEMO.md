# Kịch bản demo – Thực hành 3 (Microservice)

Mọi lệnh chạy trong **PowerShell**, tại thư mục `ecommerce-microservices`.
Postman: collection **Ecommerce MVP – Microservices**, biến `gatewayUrl = http://localhost:18080`.

---

## 0. Chuẩn bị trước giờ chấm (10 phút)

1. Đóng các ứng dụng nặng (Antigravity, tab trình duyệt thừa). Dừng bài khác nếu đang chạy:
   `docker stop product-api product-api-prod nammongodb nammongodb-prod ecommerce-api ecommerce-postgres`
2. Bật hệ thống: `docker compose up -d --no-build` → đợi 2–3 phút.
3. Kiểm tra: `docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"` → 13 container healthy, kafka-init Exited (0).
4. Mở `http://localhost:18080/api/health` → `"status":"UP"`, đủ 6 thành phần.
5. Reset tồn kho (product-service seed khi khởi động): `docker compose restart product-service`
6. Postman: Send 4 request đầu của folder **04** (Health + 3 Login) để có token mới (JWT sống 1 giờ).

Nếu một service DOWN: `docker compose logs <tên> --tail 30`, rồi `docker compose restart <tên>`.
Nếu `docker` báo lỗi 500: Quit Docker Desktop → `wsl --shutdown` → mở lại, đợi 2 phút.

---

## Mục 1 – Giải thích các proto và cấu trúc dự án

**Cấu trúc:** mỗi bounded context = 1 service + 1 DB riêng (Database-per-Service).

```
api-gateway/  auth-service/  customer-service/  product-service/  order-service/  shipment-service/
proto/ (customer.proto, product.proto)   docker-compose.yml   docs/
```
Mỗi service chia 4 lớp DDD: `domain/` (quy tắc nghiệp vụ, vd `discount.policy.js`, `shipment.transitions.js`)
→ `application/` (use case) → `infrastructure/` (DB, gRPC client, Kafka) → `interfaces/` (HTTP routes, gRPC handler, Kafka consumer).

**customer.proto** – CustomerService: `GetCustomer`, `GetMembershipScore` (order-service gọi để tính discount),
`CreateCustomer` (auth-service gọi khi đăng ký).
**product.proto** – ProductService: `GetProducts` (giá + tồn kho), `DecreaseStock` (trừ kho), `RestoreStock` (hoàn kho khi tạo đơn lỗi).

Demo gRPC:
```
docker compose exec customer-service node scripts/grpc-smoke.js
docker compose exec product-service node scripts/grpc-smoke.js
```
Ý cần nói:
- Số sau dấu `=` là field number (nhãn nhị phân khi truyền), không được đổi sau khi dùng.
- proto3 không có null → không tìm thấy thì trả **status code 5 NOT_FOUND**; thiếu hàng **9 FAILED_PRECONDITION**; không kết nối được **14 UNAVAILABLE**.
- gRPC giữa service: hợp đồng kiểu chặt, nhị phân nhỏ gọn, sinh client/server từ cùng file .proto. Client bên ngoài dùng REST qua Gateway.
- Trừ kho nhiều sản phẩm: Mongo 1 node không có transaction → trừ từng item có điều kiện `quantity >= qty`, item sau thiếu thì hoàn lại item trước (tư tưởng Saga/bù trừ).

---

## Mục 2 – CLI: compose và liệt kê container đúng thiết kế

```
docker compose up -d --no-build
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```
Đối chiếu sơ đồ kiến trúc:

| Thiết kế | Container |
|---|---|
| API Gateway + Redis | api-gateway (port **18080** duy nhất ra ngoài), redis |
| Auth Service + PostgreSQL | auth-service, auth-db |
| Customer Service + PostgreSQL | customer-service, customer-db |
| Product Service + MongoDB | product-service, product-db |
| Order Service + PostgreSQL | order-service, order-db |
| Shipment Service + MongoDB | shipment-service, shipment-db |
| Kafka (message broker) | kafka (KRaft), kafka-init (tạo topic rồi thoát) |

Ý cần nói: `depends_on: condition: service_healthy` (service chờ DB healthy); healthcheck mọi container;
`init: true` chống zombie; `mem_limit` + giới hạn cache Mongo để chạy trên máy 8 GB; chỉ Gateway mở port ra ngoài.

---

## Mục 3 – Kiểm tra và giải thích hệ thống Kafka

```
docker exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --list
docker exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --describe --topic order-created
docker exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --group shipment-service
docker exec kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:29092 --topic order-created --from-beginning --property print.key=true --timeout-ms 5000
```
Ý cần nói:
- KRaft 1 node (không Zookeeper); 2 listener: `kafka:29092` cho container, `127.0.0.1:19092` cho máy host.
- Topic `order-created` 3 partition; message key = `oid` → các event cùng đơn vào cùng partition, giữ thứ tự.
- Consumer group `shipment-service`; cột **LAG = 0** nghĩa là đã xử lý hết.
- **Outbox pattern:** Order + OrderDetail + OutboxEvent ghi trong 1 transaction → publisher nền gửi lên Kafka → PUBLISHED. Kafka chết không mất event.
- **Idempotent consumer:** Kafka giao at-least-once → unique index trên `oid` và `eventId`, nhận trùng không tạo Shipment trùng (TC-SHP-05).

Thí nghiệm (nếu còn thời gian):
```
docker compose stop kafka
(Postman: gửi 1 đơn hàng → vẫn 201)
docker compose exec order-service node scripts/outbox-status.js   → PENDING, attempts tăng
docker compose start kafka   (đợi ~40 giây)
docker compose exec order-service node scripts/outbox-status.js   → PUBLISHED
docker compose restart shipment-service   (cho consumer kết nối lại nhanh)
```

---

## Mục 4 – TC-PRO-01: Lấy danh sách Product

Postman folder 04 → **TC-PRO-01 (qua Gateway)** → 200, danh sách sản phẩm.
Send lại **Redis cache: gọi lại lần 2** → header `X-Cache: HIT` (Redis cache tại Gateway, TTL 60 giây, tự xóa khi sản phẩm hoặc tồn kho đổi).

## Mục 5 – TC-CUS-04: Lấy thông tin Membership

Postman folder 04 → **TC-CUS-04 (qua Gateway)** → `{"uid":5,"mid":3,"mname":"GOLD","score":1000}`.
Endpoint `GET /api/customers/:uid/membership` (bổ sung vì API Spec gốc chưa có endpoint trả mname + score).

## Mục 6 – TC-CUS-05: Truy vấn Customer không có token

Postman folder 04 → **TC-CUS-05 (qua Gateway)** → **401**, Gateway chặn trước khi tới service.
Thêm: **Chống giả mạo header** → token CUSTOMER kèm `x-user-role: ADMIN` vẫn **403** (Gateway xóa header client gửi, gắn lại từ JWT).

## Mục 7 – TC-ORD-04: Tính discount theo score

Postman folder 06 → 3 request **TC-ORD-04a/b/c**: cùng giỏ (1 Keyboard 45 + 2 Mouse 25 = 95)

| Khách | score | discount | total_amount |
|---|---|---|---|
| bronze_user | 0 | 0% | 95 |
| silver_user | 500 | 5% | 90.25 |
| gold_user | 1000 | 10% | 85.5 |

Quy tắc ở `order-service/src/domain/discount.policy.js`: score ≥ 1000 → 10%, ≥ 500 → 5%, còn lại 0%.
Unit test (chạy trên máy): `cd order-service; npm run test:discount` → 7/7 pass.
Ý cần nói: giá lấy từ product-service qua gRPC (không tin giá client gửi); tính tiền bằng số nguyên (cent) để tránh sai số.

## Mục 8 – TC-ORD-05: Tạo Order và phát sự kiện

Postman folder 07 → **TC-ORD-05** (201) → **TC-ORD-05b** (tự đợi, Shipment PENDING xuất hiện).
Chứng minh sự kiện đi qua Kafka:
```
docker compose exec order-service node scripts/outbox-status.js
docker compose logs order-service --tail 5        → [outbox] published oid=...
docker compose logs shipment-service --tail 5     → [shipment] created shipid=... for oid=...
```
Tiếp tục folder 07: STAFF chuyển SHIPPING → khách xem trạng thái → DELIVERED.

---

## Câu hỏi hay gặp

- **Vì sao Database-per-Service?** Mỗi service độc lập dữ liệu, đổi schema không ảnh hưởng service khác; chỉ giao tiếp qua gRPC/Kafka.
- **Vì sao gRPC đồng bộ cho Customer/Product nhưng Kafka cho Shipment?** Tạo đơn cần ngay discount, giá và tồn kho (phải chờ kết quả); giao hàng xử lý sau được, tách rời để Shipment chết không làm hỏng đặt hàng.
- **Gateway làm gì?** Routing, xác thực JWT, phân quyền theo role, rate limit (Redis, 429), cache (Redis), logging có X-Request-Id, health tổng hợp.
- **Header x-user-id có bị giả mạo?** Không: Gateway xóa header client gửi và gắn lại từ JWT; trong Docker chỉ Gateway mở port.
- **Trừ kho xong mà lưu đơn lỗi?** Order-service gọi `RestoreStock` để hoàn kho (bù trừ).
- **Vì sao không publish Kafka ngay sau khi lưu đơn?** Kafka chết sẽ mất event; Outbox ghi event cùng transaction rồi gửi lại tới khi thành công.
- **`init: true` để làm gì?** Có tiến trình init làm PID 1 chuyển tín hiệu dừng và dọn tiến trình con, tránh container zombie.
