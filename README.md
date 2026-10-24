# Ecommerce MVP Microservices

Dự án Ecommerce MVP xây dựng theo kiến trúc Microservices hướng Domain-Driven Design (DDD), Event-Driven Architecture và mô hình Database-per-Service.

---

## 1. Hạ tầng dịch vụ (Infrastructure Containers)

Bảng tổng hợp các container hạ tầng được cấu hình trong `docker-compose.yml`:

| Container | Image | Port Host | Port Container | Mục đích / Ghi chú |
|---|---|---|---|---|
| `auth-db` | `postgres:16-alpine` | `15433` | `5432` | Lưu trữ dữ liệu User, Role cho `auth-service` |
| `customer-db` | `postgres:16-alpine` | `15434` | `5432` | Lưu trữ dữ liệu Customer, MemberShip cho `customer-service` |
| `order-db` | `postgres:16-alpine` | `15435` | `5432` | Lưu trữ dữ liệu Order, OrderDetail, OutboxEvent cho `order-service` |
| `product-db` | `mongo:7` | `37018` | `27017` | Lưu trữ danh mục Product, tồn kho cho `product-service` |
| `shipment-db` | `mongo:7` | `37019` | `27017` | Lưu trữ trạng thái giao vận Shipment cho `shipment-service` |
| `redis` | `redis:7-alpine` | `16379` | `6379` | Cache và Rate Limiting cho `api-gateway` |
| `kafka` | `apache/kafka:3.7.2` | `19092` | `19092` (host)<br>`29092` (nội bộ) | Message Broker chế độ KRaft single-node (không Zookeeper) |
| `kafka-init` | `apache/kafka:3.7.2` | – | – | Khởi tạo topic `order-created` (3 partitions, 1 replica) khi Kafka healthy rồi thoát |

Tất cả container hạ tầng kết nối qua mạng nội bộ Docker: `ecommerce-net`.

### Bảng Port Ứng Dụng & Hạ Tầng

#### Port ứng dụng (chạy Node.js cục bộ - Bước 2–9):
| Service | HTTP Port | gRPC Port | Ghi chú |
|---|---|---|---|
| `api-gateway` | `4100` | – | Entry point REST API |
| `auth-service` | `4101` | – | Quản lý Auth, User, JWT |
| `customer-service` | `4102` | `50052` | Quản lý Customer & Membership |
| `product-service` | `4103` | `50053` | Quản lý Product & Stock |
| `order-service` | `4104` | – | Quản lý Order & Outbox |
| `shipment-service` | `4105` | – | Quản lý Shipment & Event Consume |

*Lưu ý: Tuyệt đối không dùng các port 3000, 3001, 5433, 8080, 27017 do đã bị chiếm dụng trên host.*

#### Port hạ tầng kết nối từ máy Host:
- `auth-db`: `localhost:15433` (PostgreSQL)
- `customer-db`: `localhost:15434` (PostgreSQL)
- `order-db`: `localhost:15435` (PostgreSQL)
- `product-db`: `localhost:37018` (MongoDB)
- `shipment-db`: `localhost:37019` (MongoDB)
- `redis`: `localhost:16379` (Redis)
- `kafka`: `localhost:19092` (Kafka)

#### Khi chạy Docker Compose đầy đủ (Bước 10):
- Chỉ duy nhất `api-gateway` publish ra host port `18080`.
- Các service nội bộ kết nối qua tên container và port nội bộ trong Docker network (`auth-db:5432`, `product-db:27017`, `redis:6379`, `kafka:29092`).

---

## 2. Vì sao áp dụng mô hình Database-per-Service?

Dự án áp dụng chặt chẽ pattern **Database-per-Service** vì các lý do cốt lõi sau:

1. **Loose Coupling (Giảm thiểu phụ thuộc lẫn nhau)**:
   - Các microservice không truy cập trực tiếp vào schema hay bảng của service khác.
   - Mỗi service có toàn quyền thay đổi schema nội bộ, tối ưu hóa câu truy vấn hoặc nâng cấp cơ sở dữ liệu mà không gây ảnh hưởng đến các service khác.
2. **Độc lập triển khai và mở rộng (Independent Scaling & Deployment)**:
   - Từng service có thể co giãn (scale-out) tài nguyên lưu trữ độc lập theo nhu cầu thực tế (ví dụ: `order-db` cần nhiều tài nguyên I/O hơn trong đợt khuyến mãi).
3. **Phù hợp công nghệ theo đặc thù dữ liệu (Polyglot Persistence)**:
   - Dữ liệu giao dịch, quan hệ chặt chẽ và tính nhất quán cao (ACID) của User, Customer, Order sử dụng cơ sở dữ liệu quan hệ **PostgreSQL**.
   - Dữ liệu tài liệu linh hoạt, phi cấu trúc hoặc thường xuyên thay đổi thuộc tính của Product Catalog và Shipment sử dụng cơ sở dữ liệu NoSQL **MongoDB**.
4. **Cách ly lỗi (Fault Domain Isolation)**:
   - Sự cố ở một cơ sở dữ liệu (ví dụ quá tải kết nối, lỗi phần cứng) chỉ ảnh hưởng tới service phụ trách, không kéo sập toàn bộ hệ sinh thái thương mại điện tử.
   - Giao tiếp giữa các service chỉ thực hiện qua API đồng bộ (**gRPC**) hoặc bất đồng bộ (**Kafka event**), đảm bảo tính toàn vẹn của Bounded Context.

---

## 3. Hướng dẫn khởi động hạ tầng

1. Sao chép cấu hình biến môi trường:
   ```bash
   cp .env.example .env
   ```
2. Khởi động toàn bộ hạ tầng container:
   ```bash
   docker compose up -d
   ```
3. Kiểm tra trạng thái sức khỏe các container:
   ```bash
   docker compose ps -a
   ```
