# Product Service

## Bounded Context
Product Service owns the Product Catalog bounded context.
It manages product metadata including name, price, description, and available inventory count.
It exposes gRPC endpoints for order-service to batch-fetch product pricing and perform atomic stock deductions or compensations.
