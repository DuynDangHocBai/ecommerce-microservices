const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../infrastructure/db/prisma');
const { ROLES } = require('../domain/role');
const { AppError } = require('../domain/errors');

const customerGrpcClient = require('../infrastructure/grpc/customer.client');

class AuthService {
  async register({ username, password, email, phone }) {
    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    if (existingUsername) {
      throw new AppError('Username or email already exists', 409);
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });
      if (existingEmail) {
        throw new AppError('Username or email already exists', 409);
      }
    }

    // Find default role CUSTOMER
    const customerRole = await prisma.role.findUnique({
      where: { rolename: ROLES.CUSTOMER }
    });
    if (!customerRole) {
      throw new AppError('Default role CUSTOMER not found in database', 500);
    }

    // Hash password with bcryptjs (10 rounds)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        phone: phone || null,
        roleid: customerRole.roleid
      }
    });

    // Call customer-service via gRPC CreateCustomer
    try {
      await customerGrpcClient.createCustomer({
        uid: newUser.uid,
        fullname: username,
        mid: 1
      });
    } catch (grpcError) {
      console.error(`[auth-service] gRPC createCustomer failed for uid ${newUser.uid}:`, grpcError.message || grpcError);
      try {
        await prisma.user.delete({
          where: { uid: newUser.uid }
        });
      } catch (deleteError) {
        console.error(`[auth-service] Failed to rollback user uid ${newUser.uid}:`, deleteError.message);
      }
      throw new AppError('Customer service unavailable', 503);
    }

    return {
      message: 'User registered successfully',
      uid: newUser.uid
    };
  }

  async login({ username, password }) {
    // Find user with role
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true }
    });

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid username or password', 401);
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'default_jwt_secret';
    const expiresInSeconds = parseInt(process.env.JWT_EXPIRES_IN, 10) || 3600;

    const payload = {
      sub: user.uid,
      role: user.role ? user.role.rolename : 'CUSTOMER'
    };

    const accessToken = jwt.sign(payload, secret, {
      expiresIn: expiresInSeconds
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds
    };
  }

  async checkHealth() {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'UP',
      service: 'auth-service',
      db: 'UP'
    };
  }
}

module.exports = new AuthService();
