const mongoose = require('mongoose');

const busRouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please enter Route Name'],
  },
  stations: {
    type: String,
    required: [true, 'Please enter number of Stations'],
  },
  stationList: [
    {
      type: Object,
    },
  ],
  layouts: [
    {
      type: Object,
    },
  ],
  info: [
    {
      type: Object,
    },
  ],
  routePermitDoc: {
    type: String,
    default: 'none',
  },
  authorityId: {
    type: mongoose.Schema.ObjectId,
    ref: 'busOwner',
  },

  approvalStatus: {
    type: String,
    default: 'pending',
  },
});

module.exports = mongoose.model('BusRoute', busRouteSchema);
