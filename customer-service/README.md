# Customer Service

## Bounded Context
Customer Service manages the Customer & Membership bounded context.
It maintains customer profiles (fullname, linked user account) and membership tier tiers with reward scores.
It provides gRPC interfaces for other services to query customer information, verify loyalty scores, and create initial customer profiles upon registration.
