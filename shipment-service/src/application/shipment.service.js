const Shipment = require('../infrastructure/db/models/shipment.model');
const ProcessedEvent = require('../infrastructure/db/models/processed-event.model');
const { getNextShipId } = require('../infrastructure/db/models/counter.model');
const { checkDBHealth } = require('../infrastructure/db/mongoose');
const { checkKafkaHealth } = require('../infrastructure/kafka/kafka.client');
const { isValidTransition } = require('../domain/shipment.transitions');
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  AppError
} = require('../domain/errors');

class ShipmentService {
  async processOrderCreatedEvent(payload) {
    if (!payload || typeof payload !== 'object') {
      return { status: 'INVALID', reason: 'Payload must be a valid JSON object' };
    }

    const { eventId, oid, uid } = payload;

    if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') {
      return { status: 'INVALID', reason: 'Missing or invalid eventId' };
    }

    const numericOid = Number(oid);
    if (!numericOid || !Number.isInteger(numericOid) || numericOid <= 0) {
      return { status: 'INVALID', reason: `Invalid oid: ${oid}` };
    }

    const numericUid = Number(uid);
    if (!numericUid || !Number.isInteger(numericUid) || numericUid <= 0) {
      return { status: 'INVALID', reason: `Invalid uid: ${uid}` };
    }

    // Idempotency check 1: ProcessedEvent
    const existingEvent = await ProcessedEvent.findOne({ eventId });
    if (existingEvent) {
      return { status: 'DUPLICATE', reason: `eventId ${eventId} already processed` };
    }

    // Idempotency check 2: Shipment by oid
    const existingShipment = await Shipment.findOne({ oid: numericOid });
    if (existingShipment) {
      return { status: 'DUPLICATE', reason: `Shipment for oid ${numericOid} already exists (shipid: ${existingShipment.shipid})` };
    }

    try {
      const shipid = await getNextShipId();

      const shipment = new Shipment({
        shipid,
        oid: numericOid,
        uid: numericUid,
        status: 'PENDING',
        history: [{ status: 'PENDING', at: new Date() }]
      });
      await shipment.save();

      const processedEvent = new ProcessedEvent({
        eventId,
        processedAt: new Date()
      });
      await processedEvent.save();

      return { status: 'CREATED', shipment };
    } catch (err) {
      if (err.code === 11000) {
        return { status: 'DUPLICATE', reason: 'Duplicate key error in database (11000)' };
      }
      throw err; // Transient DB error, rethrow to retry
    }
  }

  async getShipmentByShipid(shipid, user) {
    const numericShipId = Number(shipid);
    if (!numericShipId || isNaN(numericShipId)) {
      throw new BadRequestError('Invalid shipid parameter');
    }

    const shipment = await Shipment.findOne({ shipid: numericShipId });
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    if (user.role === 'CUSTOMER' && shipment.uid !== user.uid) {
      throw new ForbiddenError('Forbidden: You can only view your own shipments');
    }

    return shipment.toJSON();
  }

  async getShipmentByOid(oid, user) {
    const numericOid = Number(oid);
    if (!numericOid || isNaN(numericOid)) {
      throw new BadRequestError('Invalid oid parameter');
    }

    const shipment = await Shipment.findOne({ oid: numericOid });
    if (!shipment) {
      throw new NotFoundError('Shipment not found for this order');
    }

    if (user.role === 'CUSTOMER' && shipment.uid !== user.uid) {
      throw new ForbiddenError('Forbidden: You can only view your own shipments');
    }

    return shipment.toJSON();
  }

  async updateShipmentStatus(shipid, nextStatus, user) {
    if (user.role !== 'SHIPMENT_STAFF' && user.role !== 'ADMIN') {
      throw new ForbiddenError('Forbidden: Only SHIPMENT_STAFF or ADMIN can update shipment status');
    }

    const numericShipId = Number(shipid);
    if (!numericShipId || isNaN(numericShipId)) {
      throw new BadRequestError('Invalid shipid parameter');
    }

    const shipment = await Shipment.findOne({ shipid: numericShipId });
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    if (!isValidTransition(shipment.status, nextStatus)) {
      throw new BadRequestError(`Invalid status transition from ${shipment.status} to ${nextStatus}`);
    }

    shipment.status = nextStatus;
    shipment.history.push({ status: nextStatus, at: new Date() });
    await shipment.save();

    return {
      shipid: shipment.shipid,
      oid: shipment.oid,
      status: shipment.status
    };
  }

  async checkHealth() {
    const dbStatus = checkDBHealth();
    const kafkaStatus = await checkKafkaHealth();

    if (dbStatus !== 'UP') {
      throw new AppError('MongoDB unreachable', 503);
    }

    return {
      status: 'UP',
      service: 'shipment-service',
      db: dbStatus,
      kafka: kafkaStatus
    };
  }
}

module.exports = new ShipmentService();
