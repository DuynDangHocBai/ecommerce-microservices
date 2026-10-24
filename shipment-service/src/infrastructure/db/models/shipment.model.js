const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
      required: true
    },
    at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    shipid: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    oid: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    uid: {
      type: Number,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
      required: true
    },
    history: {
      type: [historySchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: function (doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('Shipment', shipmentSchema, 'shipments');
