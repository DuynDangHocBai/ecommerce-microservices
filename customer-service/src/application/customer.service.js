const prisma = require('../infrastructure/db/prisma');
const {
  NotFoundError,
  BadRequestError,
  AppError
} = require('../domain/errors');

class CustomerService {
  async getCustomerById(uid) {
    const customer = await prisma.customer.findUnique({
      where: { uid: parseInt(uid, 10) }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return {
      uid: customer.uid,
      fullname: customer.fullname,
      mid: customer.mid
    };
  }

  async getMembershipScore(uid) {
    const customer = await prisma.customer.findUnique({
      where: { uid: parseInt(uid, 10) },
      include: { membership: true }
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return {
      uid: customer.uid,
      mid: customer.mid,
      mname: customer.membership.mname,
      score: customer.membership.score
    };
  }

  async createCustomer({ uid, fullname, mid = 1 }) {
    const parsedUid = parseInt(uid, 10);
    const parsedMid = parseInt(mid, 10) || 1;

    // Check if customer already exists
    const existing = await prisma.customer.findUnique({
      where: { uid: parsedUid }
    });
    if (existing) {
      throw new AppError('Customer already exists', 409);
    }

    // Verify membership exists
    const membership = await prisma.membership.findUnique({
      where: { mid: parsedMid }
    });
    if (!membership) {
      throw new BadRequestError('Invalid membership id');
    }

    const newCustomer = await prisma.customer.create({
      data: {
        uid: parsedUid,
        fullname,
        mid: parsedMid
      }
    });

    return {
      uid: newCustomer.uid,
      fullname: newCustomer.fullname,
      mid: newCustomer.mid
    };
  }

  async updateCustomer(uid, { fullname, mid }) {
    const parsedUid = parseInt(uid, 10);

    const customer = await prisma.customer.findUnique({
      where: { uid: parsedUid }
    });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const updateData = {};
    if (fullname !== undefined) {
      updateData.fullname = fullname;
    }

    if (mid !== undefined) {
      const parsedMid = parseInt(mid, 10);
      const membership = await prisma.membership.findUnique({
        where: { mid: parsedMid }
      });
      if (!membership) {
        throw new BadRequestError('Invalid membership id');
      }
      updateData.mid = parsedMid;
    }

    await prisma.customer.update({
      where: { uid: parsedUid },
      data: updateData
    });

    return {
      message: 'Customer updated successfully',
      uid: parsedUid
    };
  }

  async checkHealth() {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'UP',
      service: 'customer-service',
      db: 'UP',
      grpc: 'UP'
    };
  }
}

module.exports = new CustomerService();
