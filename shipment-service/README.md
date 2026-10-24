# Shipment Service

## Bounded Context
Shipment Service owns the Shipment & Delivery bounded context.
It listens for `order-created` events published to Apache Kafka to asynchronously initialize shipment records with idempotent handling.
It provides endpoints for shipping personnel and administrators to update and track delivery stages (PENDING, SHIPPING, DELIVERED, CANCELLED).
