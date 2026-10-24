const mongoose = require('mongoose');
const Product = require('../infrastructure/models/product.model');
const Counter = require('../infrastructure/models/counter.model');
const {
  AppError,
  NotFoundError,
  BadRequestError
} = require('../domain/errors');

class ProductService {
  async getAllProducts() {
    const products = await Product.find().sort({ pid: 1 }).lean();
    return {
      items: products.map(p => ({
        pid: p.pid,
        pname: p.pname,
        price: p.price,
        quantity: p.quantity
      }))
    };
  }

  async getProductByPid(pid) {
    const parsedPid = parseInt(pid, 10);
    const product = await Product.findOne({ pid: parsedPid }).lean();
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return {
      pid: product.pid,
      pname: product.pname,
      price: product.price,
      quantity: product.quantity
    };
  }

  async createProduct({ pname, price, quantity }) {
    const counter = await Counter.findByIdAndUpdate(
      'pid',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const newProduct = await Product.create({
      pid: counter.seq,
      pname,
      price,
      quantity
    });

    return {
      pid: newProduct.pid,
      pname: newProduct.pname,
      price: newProduct.price,
      quantity: newProduct.quantity
    };
  }

  async updateProduct(pid, updateData) {
    const parsedPid = parseInt(pid, 10);
    const product = await Product.findOne({ pid: parsedPid });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const allowedUpdates = {};
    if (updateData.pname !== undefined) allowedUpdates.pname = updateData.pname;
    if (updateData.price !== undefined) allowedUpdates.price = updateData.price;
    if (updateData.quantity !== undefined) allowedUpdates.quantity = updateData.quantity;

    await Product.findOneAndUpdate({ pid: parsedPid }, { $set: allowedUpdates });

    return {
      message: 'Product updated successfully',
      pid: parsedPid
    };
  }

  async deleteProduct(pid) {
    const parsedPid = parseInt(pid, 10);
    const product = await Product.findOne({ pid: parsedPid });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await Product.deleteOne({ pid: parsedPid });

    return {
      message: 'Product deleted successfully',
      pid: parsedPid
    };
  }

  async getProductsByPids(pids) {
    if (!pids || !Array.isArray(pids) || pids.length === 0) {
      throw new BadRequestError('pids list cannot be empty');
    }

    const uniquePids = [...new Set(pids.map(Number))];
    const products = await Product.find({ pid: { $in: uniquePids } }).lean();

    if (products.length < uniquePids.length) {
      const foundPids = new Set(products.map(p => p.pid));
      const missingPids = uniquePids.filter(p => !foundPids.has(p));
      throw new NotFoundError(`Product(s) not found: ${missingPids.join(', ')}`);
    }

    return {
      items: products.map(p => ({
        pid: p.pid,
        pname: p.pname,
        price: p.price,
        quantity: p.quantity
      }))
    };
  }

  async decreaseStock(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Stock items list cannot be empty');
    }

    // Merge duplicate pids and validate inputs
    const mergedMap = new Map();
    for (const item of items) {
      const pid = Number(item.pid);
      const qty = Number(item.qty);

      if (!pid || pid <= 0 || !qty || qty <= 0 || !Number.isInteger(qty)) {
        throw new BadRequestError('Each stock item must have valid pid and positive integer qty');
      }

      mergedMap.set(pid, (mergedMap.get(pid) || 0) + qty);
    }

    const mergedItems = Array.from(mergedMap.entries()).map(([pid, qty]) => ({ pid, qty }));
    const pids = mergedItems.map(i => i.pid);

    // Verify all pids exist in database first
    const existing = await Product.find({ pid: { $in: pids } }).lean();
    if (existing.length < pids.length) {
      const foundPids = new Set(existing.map(p => p.pid));
      const missingPids = pids.filter(p => !foundPids.has(p));
      throw new NotFoundError(`Product(s) not found: ${missingPids.join(', ')}`);
    }

    // Atomically decrement stock item by item, compensating on failure
    const deducted = [];
    for (const item of mergedItems) {
      const updated = await Product.findOneAndUpdate(
        { pid: item.pid, quantity: { $gte: item.qty } },
        { $inc: { quantity: -item.qty } },
        { new: true }
      );

      if (!updated) {
        // Rollback all previously deducted items in this request
        for (const prev of deducted) {
          await Product.findOneAndUpdate(
            { pid: prev.pid },
            { $inc: { quantity: prev.qty } }
          );
        }

        const err = new AppError(`Insufficient stock for product pid ${item.pid}`, 412);
        err.code = 'FAILED_PRECONDITION';
        err.failedPid = item.pid;
        throw err;
      }

      deducted.push(item);
    }

    // Retrieve updated products
    const finalProducts = await Product.find({ pid: { $in: pids } }).lean();
    return {
      success: true,
      items: finalProducts.map(p => ({
        pid: p.pid,
        pname: p.pname,
        price: p.price,
        quantity: p.quantity
      }))
    };
  }

  async restoreStock(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Stock items list cannot be empty');
    }

    const mergedMap = new Map();
    for (const item of items) {
      const pid = Number(item.pid);
      const qty = Number(item.qty);

      if (!pid || pid <= 0 || !qty || qty <= 0 || !Number.isInteger(qty)) {
        throw new BadRequestError('Each stock item must have valid pid and positive integer qty');
      }

      mergedMap.set(pid, (mergedMap.get(pid) || 0) + qty);
    }

    const pids = Array.from(mergedMap.keys());
    for (const [pid, qty] of mergedMap.entries()) {
      await Product.findOneAndUpdate(
        { pid },
        { $inc: { quantity: qty } }
      );
    }

    const finalProducts = await Product.find({ pid: { $in: pids } }).lean();
    return {
      success: true,
      items: finalProducts.map(p => ({
        pid: p.pid,
        pname: p.pname,
        price: p.price,
        quantity: p.quantity
      }))
    };
  }

  async checkHealth() {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready');
    }
    await mongoose.connection.db.admin().ping();
    return {
      status: 'UP',
      service: 'product-service',
      db: 'UP',
      grpc: 'UP'
    };
  }
}

module.exports = new ProductService();
