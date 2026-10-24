# Auth Service

## Bounded Context
Auth Service manages the Identity & Access bounded context for the application.
It encapsulates user registration, credential hashing with bcrypt, and login validation.
It is responsible for issuing signed JSON Web Tokens (JWT) containing user ID and assigned role for access control.
