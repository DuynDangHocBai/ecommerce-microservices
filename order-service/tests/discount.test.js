const { test, describe } = require('node:test');
const assert = require('node:assert');
const { calculateDiscount, calculateTotalAmount } = require('../src/domain/discount.policy');

describe('Discount Policy Tests', () => {
  test('calculateDiscount for score 0 should be 0%', () => {
    assert.strictEqual(calculateDiscount(0), 0);
  });

  test('calculateDiscount for score 499 should be 0%', () => {
    assert.strictEqual(calculateDiscount(499), 0);
  });

  test('calculateDiscount for score 500 should be 5%', () => {
    assert.strictEqual(calculateDiscount(500), 5);
  });

  test('calculateDiscount for score 999 should be 5%', () => {
    assert.strictEqual(calculateDiscount(999), 5);
  });

  test('calculateDiscount for score 1000 should be 10%', () => {
    assert.strictEqual(calculateDiscount(1000), 10);
  });

  test('calculateDiscount for score 5000 should be 10%', () => {
    assert.strictEqual(calculateDiscount(5000), 10);
  });

  test('calculateTotalAmount calculation accuracy', () => {
    // subtotal = 1550 (e.g. 1 Laptop 1500 + 2 Mouse 25)
    // 0% discount
    assert.strictEqual(calculateTotalAmount(1550, 0), 1550);
    // 5% discount
    assert.strictEqual(calculateTotalAmount(1550, 5), 1472.5);
    // 10% discount
    assert.strictEqual(calculateTotalAmount(1550, 10), 1395);
  });
});
