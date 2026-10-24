const crypto = require('crypto');
const prisma = require('../infrastructure/db/prisma');
const customerClient = require('../infrastructure/grpc/customer.client');
const productClient = require('../infrastructure/grpc/product.client');
const { calculateDiscount, calculateTotalAmount } = require('../domain/discount.policy');
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  AppError
} = require('../domain/errors');

class OrderService {
  async createOrder(uid, rawItems) {
    if (!uid) {
      throw new BadRequestError('User id is required');
    }

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
      throw new BadRequestError('Items must be an array with 1 to 50 items');
    }

    // a. Validate and merge duplicate pids
    const mergedMap = new Map();
    for (const item of rawItems) {
      const pid = Number(item.pid);
      const qty = Number(item.qty);

      if (!pid || pid <= 0 || !Number.isInteger(pid) || !qty || qty <= 0 || !Number.isInteger(qty)) {
        throw new BadRequestError('Each item must contain positive integer pid and qty');
      }

      mergedMap.set(pid, (mergedMap.get(pid) || 0) + qty);
    }

    const mergedItems = Array.from(mergedMap.entries()).map(([pid, qty]) => ({ pid, qty }));
    const pids = mergedItems.map(i => i.pid);

    // b. gRPC GetCustomer(uid)
    await customerClient.getCustomer(uid);

    // c. gRPC GetMembershipScore(uid) -> calculate discount percentage
    const membership = await customerClient.getMembershipScore(uid);
    const discount = calculateDiscount(membership.score);

    // d. gRPC GetProducts(pids) -> verify stock & retrieve official unit_price
    const productsRes = await productClient.getProducts(pids);
    const productList = productsRes.items || [];
    const productMap = new Map(productList.map(p => [p.pid, p]));

    for (const item of mergedItems) {
      const prod = productMap.get(item.pid);
      if (!prod) {
        throw new NotFoundError(`Product pid ${item.pid} not found`);
      }
      if (prod.quantity < item.qty) {
        throw new ConflictError(`Insufficient stock for product pid ${item.pid}: requested ${item.qty}, available ${prod.quantity}`);
      }
      item.unit_price = Number(prod.price);
    }

    // e. gRPC DecreaseStock(items)
    await productClient.decreaseStock(mergedItems.map(i => ({ pid: i.pid, qty: i.qty })));

    // f. Prisma transaction: Order + OrderDetails + OutboxEvent
    let orderResult;
    try {
      const subtotal = mergedItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
      const totalAmount = calculateTotalAmount(subtotal, discount);

      orderResult = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            uid,
            discount,
            total_amount: totalAmount,
            order_details: {
              create: mergedItems.map(item => ({
                pid: item.pid,
                qty: item.qty,
                unit_price: item.unit_price
              }))
            }
          },
          include: {
            order_details: true
          }
        });

        const eventId = crypto.randomUUID();
        await tx.outboxEvent.create({
          data: {
            aggregate_id: order.oid,
            event_type: 'OrderCreated',
            payload: {
              eventId,
              eventType: 'OrderCreated',
              oid: order.oid,
              uid,
              discount: Number(order.discount),
              total_amount: Number(order.total_amount),
              items: order.order_details.map(d => ({
                pid: d.pid,
                qty: d.qty,
                unit_price: Number(d.unit_price)
              })),
              createdAt: order.created_at.toISOString()
            },
            status: 'PENDING'
          }
        });

        return order;
      });
    } catch (txError) {
      console.error('[order-service] Transaction error, triggering stock compensation rollback:', txError.message);
      try {
        await productClient.restoreStock(mergedItems.map(i => ({ pid: i.pid, qty: i.qty })));
      } catch (restoreErr) {
        console.error('[order-service] CRITICAL: Stock compensation failed:', restoreErr.message);
      }
      throw new AppError('Failed to create order transaction', 500);
    }

    // h. Success response
    return {
      oid: orderResult.oid,
      uid: orderResult.uid,
      discount: Number(orderResult.discount),
      total_amount: Number(orderResult.total_amount),
      items: orderResult.order_details.map(d => ({
        pid: d.pid,
        qty: d.qty,
        unit_price: Number(d.unit_price)
      })),
      shipment: {
        status: 'PENDING'
      }
    };
  }

  async getOrders(user) {
    const where = {};
    if (user.role !== 'ADMIN') {
      where.uid = user.uid;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        order_details: true
      },
      orderBy: {
        oid: 'desc'
      }
    });

    return {
      items: orders.map(o => ({
        oid: o.oid,
        uid: o.uid,
        discount: Number(o.discount),
        total_amount: Number(o.total_amount),
        created_at: o.created_at,
        items: o.order_details.map(d => ({
          pid: d.pid,
          qty: d.qty,
          unit_price: Number(d.unit_price)
        }))
      }))
    };
  }

  async getOrderById(oid, user) {
    const parsedOid = parseInt(oid, 10);
    const order = await prisma.order.findUnique({
      where: { oid: parsedOid },
      include: {
        order_details: true
      }
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (user.role !== 'ADMIN' && order.uid !== user.uid) {
      throw new ForbiddenError('Forbidden: You can only view your own orders');
    }

    return {
      oid: order.oid,
      uid: order.uid,
      discount: Number(order.discount),
      total_amount: Number(order.total_amount),
      created_at: order.created_at,
      items: order.order_details.map(d => ({
        pid: d.pid,
        qty: d.qty,
        unit_price: Number(d.unit_price)
      }))
    };
  }

  async checkHealth() {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'UP',
      service: 'order-service',
      db: 'UP'
    };
  }
}

module.exports = new OrderService();
