const VALID_TRANSITIONS = {
  PENDING: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};

function isValidTransition(currentStatus, nextStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) {
    return false;
  }
  return allowed.includes(nextStatus);
}

module.exports = {
  VALID_TRANSITIONS,
  isValidTransition
};
