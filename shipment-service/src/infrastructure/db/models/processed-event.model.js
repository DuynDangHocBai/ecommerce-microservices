const mongoose = require('mongoose');

const processedEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    processedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
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

module.exports = mongoose.model('ProcessedEvent', processedEventSchema, 'processed_events');
