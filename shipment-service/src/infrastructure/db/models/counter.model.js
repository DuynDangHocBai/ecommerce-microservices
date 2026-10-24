const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

async function getNextShipId() {
  const counter = await mongoose.model('Counter', counterSchema, 'counters').findByIdAndUpdate(
    { _id: 'shipid' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

const Counter = mongoose.model('Counter', counterSchema, 'counters');

module.exports = {
  Counter,
  getNextShipId
};
