const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busName: {
    type: String,
    required: [true, 'Please Enter Bus Name'],
    unique: [true, 'This Bus Name Already Exists'],
    maxlength: [30, 'Name cannot exceed 30 characters'],
    minlength: [4, 'Name should have more than 4 characters'],
  },
  busLicenseDoc: {
    type: String,
    required: true,
  },
  busLicenseNumber: {
    type: String,
    require: [true, 'Please provide license number'],
  },
  engineNumber: {
    type: String,
    unique: [true, 'This Engine Number Already Exists'],
    required: true,
  },
  ac: {
    type: Boolean,
    default: false,
  },
  seatNumber: {
    type: Number,
    require: [true, 'Please provide seat number'],
  },
  seatLayout: {
    type: String,
    required: true,
  },
  routePermit: {
    type: String,
    required: true,
  },
  routeId: {
    type: mongoose.Schema.ObjectId,
    ref: 'BusRoute',
  },

  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'busOwner',
  },
  status: {
    type: String,
    default: 'Pending',
  },
});

module.exports = mongoose.model('Bus', busSchema);
