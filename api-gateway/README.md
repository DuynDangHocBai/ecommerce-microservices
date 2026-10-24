# API Gateway

## Bounded Context
API Gateway serves as the single entry point for all client requests in the e-commerce system.
It handles client request routing to internal downstream microservices via HTTP REST proxy.
It is responsible for centralized JWT authentication, role-based authorization, rate limiting using Redis, and request logging.
