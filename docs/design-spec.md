# Ecommerce MVP – Microservices Design Spec (nguồn sự thật cho agent)

Tổng hợp từ: Customer-Requirement, Functional Requirements (FR01–FR13), Use Cases (UC01–UC13),
API Specification, 25 Test Cases, ERD, Bounded Context, Business Process Model, Microservice Architecture.
Ảnh gốc nằm cùng thư mục `docs/`.

## 1. Kiến trúc tổng thể

- Client → **API Gateway** (REST/HTTPS JSON) → các service.
- API Gateway: routing, authentication (JWT validation), authorization (role), rate limiting, logging. Dùng **Redis** cho rate limiting + cache.
- Database-per-Service:

| Service | Bounded Context | DB | Bảng/Collection |
|---|---|---|---|
| auth-service | Identity & Access | PostgreSQL (auth-db) | User, Role |
| customer-service | Customer & Membership | PostgreSQL (customer-db) | Customer, MemberShip |
| product-service | Product Catalog | MongoDB (product-db) | products |
| order-service | Order Management | PostgreSQL (order-db) | Order, OrderDetail, OutboxEvent |
| shipment-service | Shipment | MongoDB (shipment-db) | shipments |
| api-gateway | – | Redis | rate-limit, cache |

- Giao tiếp đồng bộ giữa service: **gRPC** (order → customer, order → product).
- Giao tiếp bất đồng bộ: **Kafka**, topic `order-created` (order-service publish qua Outbox, shipment-service consume).
- Không service nào được truy cập DB của service khác. Tham chiếu chéo chỉ bằng ID (uid, pid, oid).

## 2. Data model theo từng service (từ ERD + Bounded Context)

- **Role**(roleid PK, rolename) – seed: `CUSTOMER`, `ADMIN`, `SHIPMENT_STAFF`.
- **User**(uid PK, username UNIQUE, password bcrypt, roleid FK, email UNIQUE, phone) – email/phone bổ sung vì API register yêu cầu.
- **MemberShip**(mid PK, mname, score) – seed ví dụ: (1, BRONZE, 0), (2, SILVER, 500), (3, GOLD, 1000).
- **Customer**(uid PK – tham chiếu uid của auth, fullname, mid FK → MemberShip).
- **Product**(pid INT duy nhất, pname, price DECIMAL, quantity INT).
- **Order**(oid PK, uid, discount DECIMAL(10,2), total_amount DECIMAL(10,2), created_at).
- **OrderDetail**(oid PK/FK, pid PK, qty, unit_price).
- **OutboxEvent**(id, aggregate_id, event_type, payload JSON, status PENDING|PUBLISHED, created_at, published_at).
- **Shipment**(shipid INT duy nhất, oid UNIQUE, status: PENDING|SHIPPING|DELIVERED|CANCELLED).

## 3. API Specification (Gateway public endpoints)

| ID | Method | Endpoint | Auth | Thành công | Lỗi |
|---|---|---|---|---|---|
| AUTH-01 | POST | /api/auth/register | No | 201 `{message, uid}` | 400, 409 |
| AUTH-02 | POST | /api/auth/login | No | 200 `{accessToken, tokenType:"Bearer", expiresIn:3600}` | 400, 401 |
| CUS-01 | GET | /api/customers/:uid | JWT | 200 `{uid, fullname, mid}` | 401, 404 |
| CUS-02 | PUT | /api/customers/:uid | JWT (chính chủ/Admin) | 200 `{message, uid}` | 400, 401, 403, 404 |
| PRO-01 | GET | /api/products | JWT | 200 `{items:[...]}` | 401 |
| PRO-02 | GET | /api/products/:pid | JWT | 200 product | 401, 404 |
| PRO-03 | POST | /api/products | JWT Admin | 201 product | 400, 401, 403 |
| PRO-04 | PUT | /api/products/:pid | JWT Admin | 200 `{message, pid}` | 400, 401, 403, 404 |
| PRO-05 | DELETE | /api/products/:pid | JWT Admin | 200 `{message, pid}` | 401, 403, 404 |
| ORD-01 | POST | /api/orders | JWT | 201 `{oid, uid, discount, total_amount, items:[{pid,qty,unit_price}], shipment:{status:"PENDING"}}` | 400, 401, 404, 409 (hết hàng) |
| ORD-02 | GET | /api/orders | JWT | 200 đơn của user hiện tại (Admin: tất cả) | 401 |
| ORD-03 | GET | /api/orders/:oid | JWT (chủ đơn/Admin) | 200 order + items | 401, 403, 404 |
| SHP-01 | GET | /api/shipments/:shipid | JWT | 200 `{shipid, oid, status}` | 401, 403, 404 |
| SHP-00 | GET | /api/shipments/order/:oid | JWT | 200 shipment của đơn (bổ sung để client tra cứu shipid) | 401, 404 |
| SHP-02 | PATCH | /api/shipments/:shipid/status | JWT SHIPMENT_STAFF/ADMIN | 200 `{shipid, oid, status}` | 400, 401, 403, 404 |
| HEALTH | GET | /api/health | No | 200 `{status:"UP", message:"E-commerce API is running", services:{...}}` | 503 |

JWT payload: `{ sub: uid, role: rolename }`, hết hạn 3600s. Mật khẩu hash bằng bcrypt.

## 4. Luồng chính: Đặt hàng (UC06, UC07, UC08, UC09)

1. Client `POST /api/orders {items:[{pid,qty}]}` → Gateway verify JWT, gắn header `x-user-id`, `x-user-role`, chuyển tới order-service.
2. order-service validate items (không rỗng, qty nguyên > 0, gộp pid trùng).
3. gRPC customer-service `GetCustomer(uid)` → fullname, mid (404 nếu không có).
4. gRPC customer-service `GetMembershipScore(uid)` → score.
5. Tính discount (phần trăm) theo score: score ≥ 1000 → 10; score ≥ 500 → 5; còn lại 0.
6. gRPC product-service `GetProducts(pids)` → price, quantity (404 nếu thiếu; 409 nếu không đủ hàng).
7. gRPC product-service `DecreaseStock(items)` – trừ kho nguyên tử (điều kiện `quantity >= qty`); thất bại → 409, không tạo đơn.
8. Một DB transaction: insert Order (discount, total_amount = sum(qty*unit_price) * (1 - discount/100)), OrderDetail, OutboxEvent(OrderCreated). Nếu transaction lỗi → gọi gRPC `RestoreStock(items)` (bù trừ).
9. Outbox publisher (chạy nền, poll mỗi vài giây) publish `OrderCreated {eventId, oid, uid, items, createdAt}` lên topic `order-created`, đánh dấu PUBLISHED. Kafka lỗi → giữ PENDING để retry.
10. Trả 201 cho client. shipment-service consume event → tạo Shipment status PENDING (idempotent theo oid; event thiếu oid → log lỗi, bỏ qua).

## 5. Phân quyền (UC13)

- Không có/không hợp lệ JWT → 401. Đúng JWT nhưng sai role → 403.
- ADMIN: CRUD product, xem mọi order/customer/shipment, cập nhật shipment.
- SHIPMENT_STAFF: cập nhật shipment status.
- CUSTOMER: xem product, đặt hàng, xem/cập nhật customer của chính mình, xem order/shipment của chính mình.

## 6. 25 Test Cases phải pass

IAM: TC-IAM-01 đăng ký hợp lệ 201 · 02 trùng username 409 · 03 thiếu password 400 · 04 login đúng trả JWT · 05 sai password 401
CUS: TC-CUS-01 lấy customer 200 · 02 không tồn tại 404 · 03 cập nhật fullname · 04 lấy membership trả mname+score · 05 không token 401
PRO: TC-PRO-01 list · 02 get 200 · 03 không tồn tại 404 · 04 tạo 201 · 05 cập nhật tồn kho đúng
ORD: TC-ORD-01 tạo order + detail · 02 không JWT 401 · 03 vượt tồn kho → không tạo, lỗi tồn kho · 04 discount đúng theo score · 05 lưu order + phát OrderCreated
SHP: TC-SHP-01 nhận event tạo shipment · 02 event thiếu oid không tạo, log lỗi · 03 cập nhật SHIPPING · 04 shipid không tồn tại 404 · 05 nhận event 2 lần không tạo trùng

## 7. Điểm đã chốt khác với tài liệu gốc (ghi rõ trong README khi nộp)

- Gateway → service dùng HTTP proxy REST nội bộ (mức cơ bản); gRPC dùng cho service ↔ service như sơ đồ kiến trúc.
- Order Service điều phối gọi Customer/Product (theo UC06 và sơ đồ kiến trúc), thay vì Gateway gọi trực tiếp như sơ đồ sequence.
- User có thêm email, phone; Order có thêm total_amount; thêm bảng OutboxEvent; thêm endpoint SHP-00.
- Response ORD-01 không trả shipid vì Shipment được tạo bất đồng bộ.
- Đăng ký: auth-service gọi gRPC customer-service `CreateCustomer(uid, fullname=username, mid=1)`.
