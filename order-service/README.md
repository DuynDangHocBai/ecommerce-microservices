# Order Service

## Bounded Context
Order Service manages the Order Management bounded context.
It coordinates the order placement workflow by communicating synchronously with customer and product services via gRPC.
It persists orders, order line items, and outbox events in a single database transaction, publishing `order-created` events to Kafka via the Transactional Outbox pattern.
