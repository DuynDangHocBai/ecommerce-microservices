function calculateDiscount(score) {
  if (typeof score !== 'number' || score < 0) {
    return 0;
  }
  if (score >= 1000) {
    return 10;
  }
  if (score >= 500) {
    return 5;
  }
  return 0;
}

function calculateTotalAmount(subtotal, discount) {
  const subtotalCents = Math.round(Number(subtotal) * 100);
  const discountPercent = Number(discount) || 0;
  const totalCents = Math.round((subtotalCents * (100 - discountPercent)) / 100);
  return totalCents / 100;
}

module.exports = {
  calculateDiscount,
  calculateTotalAmount
};
