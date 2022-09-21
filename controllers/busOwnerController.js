const ErrorHandler = require('../utils/errorhandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const User = require('../models/busOwnerModel');
const sendToken = require('../utils/jwtToken');
const formidable = require('formidable');
const { isFileValid, deleteFile } = require('../utils/fileOperations');
const { uploadFile } = require('../utils/awsS3');
const { generateOtp, sendOtp } = require('../utils/sendSms');
const path = require('path');
const Driver = require('../models/driverModel');
const BusRoute = require('../models/busRouteModel');
const fs = require('fs');
const Bus = require('../models/busModel');
const { v4: uuid } = require('uuid');
const FormData = require('form-data');
// const amqp = require('amqplib');
const axios = require('axios');
const logger = require('../logger/index');

//upload company information name,tin,trade

exports.uploadCompanyInfo = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  if (req.body.formType) {
    profiler.done({
      message: 'cannot parse form data because its json',
      level: 'error',
      actionBy: req.user.id,
    });
    return next(new ErrorHandler('Please provide all Informations correctly'));
  }
  const user = req.user;
  if (
    user.companyName &&
    user.TINCertificate &&
    user.tradeLicense &&
    user.approvalStatus != 'rejected'
  ) {
    profiler.done({
      message: `Authority ${user.id} Information submitted already`,
    });
    return next(new Handler(`Information already submitted`));
  }
  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.maxFileSize = 5 * 1024 * 1024; // 5MB
  form
    .parse(req, async (err, fields, files) => {
      if (err) {
        profiler.done({
          message: error,
          level: 'error',
          actionBy: req.user.id,
        });
        return res.status(400).json({
          status: 'Fail',
          message: 'There was an error parsing the files',
          error: err,
        });
      }
      const file1 = files.TIN;
      const file2 = files.Trade;
      try {
        if (isFileValid(file1) && isFileValid(file2) && fields.companyName) {
          const tinUploadProfiler = logger.startTimer();
          const resultofTINUpload = await uploadFile(file1);
          tinUploadProfiler.done({
            message: `Uploaded TIN of Authority ${user.id}`,
          });
          const tradeUploadProfiler = logger.startTimer();
          const resultofTradeUpload = await uploadFile(file2);
          tradeUploadProfiler.done({
            message: `Uploaded TIN of Authority ${user.id}`,
          });
          user.companyName = fields.companyName;
          user.TINCertificate = resultofTINUpload.Key;
          user.tradeLicense = resultofTradeUpload.Key;
          await user.save({ validateBeforeSave: false });
          //could be efficient [TODO]
          profiler.done({
            message: `Uploaded company informations of Authority ${user.id}`,
          });
          res.status(200).json({
            success: true,
            message: 'Uploaded Successfully',
          });
        } else {
          profiler.done({
            message: `Please upload Valid TIN certificate and Trade License images and Company Name`,
            level: 'error',
          });
          return next(
            new ErrorHandler(
              `Please upload Valid TIN certificate and Trade License images and Company Name`
            )
          );
        }
      } catch (error) {
        profiler.done({
          message: error,
          level: 'error',
          actionBy: req.user.id,
        });
        return next(
          new ErrorHandler(
            `Please upload Valid TIN certificate and Trade License images and Company Name`
          )
        );
      } finally {
        try {
          deleteFile(file1.filepath);
        } catch (error) {}
        try {
          deleteFile(file2.filepath);
        } catch (error) {}
      }
    })
    .on('fileBegin', function (name, file) {
      file.newFilename = uuid();
      file.filepath =
        path.join(__dirname, '../') +
        Date.now() +
        file.newFilename +
        '.' +
        file.mimetype.split('/').pop();
      console.log(file.filepath);
    })
    .on('file', function (name, file) {});
});

//same as company info, instead uploads bus owner info. could merge both functions
//TODO: merge both uploads if necessary

exports.uploadBusOwnerInfo = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  if (req.body.formType) {
    profiler.done({
      message: 'cannot parse form data because its json',
      level: 'error',
      actionBy: req.user.id,
    });
    return next(new ErrorHandler('Please provide all Informations correctly'));
  }
  const user = req.user;
  if (
    user.merchantNumber &&
    merchantType &&
    user.NIDBack &&
    user.NIDFront &&
    user.busOwnerImage &&
    user.approvalStatus != 'rejected'
  ) {
    return next(new ErrorHandler(`Information already submitted`));
  }
  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.maxFileSize = 5 * 1024 * 1024; // 5MB
  form
    .parse(req, async (err, fields, files) => {
      if (err) {
        profiler.done({
          message: err,
          level: 'error',
          actionBy: user.id,
        });
        return res.status(400).json({
          status: 'Fail',
          message: 'There was an error parsing the files',
          error: err,
        });
      }
      const file1 = files.busOwnerImage;
      const file2 = files.NIDFront;
      const file3 = files.NIDBack;
      try {
        if (
          isFileValid(file1) &&
          isFileValid(file2) &&
          isFileValid(file3) &&
          fields.merchantNumber &&
          fields.merchantType
        ) {
          //could be efficient [TODO]
          const ownerImageProfiler = logger.startTimer();
          const resultOfBusOwnerImageUpload = await uploadFile(file1);
          ownerImageProfiler.done({
            message: `Uploaded Image of Authority ${user.id}`,
          });
          const NIDFrontProfiler = logger.startTimer();

          const resultOfNIDFrontUpload = await uploadFile(file2);
          NIDFrontProfiler.done({
            message: `Uploaded NID Front of Authority ${user.id}`,
          });
          const NIDBackProfiler = logger.startTimer();
          const resultOfNIDBackUpload = await uploadFile(file3);
          NIDBackProfiler.done({
            message: `Uploaded NID Back of Authority ${user.id}`,
          });
          user.busOwnerImage = resultOfBusOwnerImageUpload.Key;
          user.NIDFront = resultOfNIDFrontUpload.Key;
          user.NIDBack = resultOfNIDBackUpload.Key;
          user.merchantNumber = fields.merchantNumber;
          user.merchantType = fields.merchantType;
          await user.save({ validateBeforeSave: false });
          profiler.done({
            message: `Uploaded personal informations of Authority ${user.id}`,
          });
          res.status(200).json({
            success: true,
            message: 'Uploaded Successfully',
          });
        } else {
          //could be efficient [TODO]

          profiler.done({
            message: `Please upload Valid TIN certificate and Trade License images and Company Name`,

            level: 'error',
            actionBy: user.id,
          });
          return next(
            new ErrorHandler(`Please upload Valid Photos and Merchant number`)
          );
        }
      } catch (error) {
        profiler.done({
          message: error,
          level: 'error',
          actionBy: req.user.id,
        });
        return next(
          new ErrorHandler(`Please upload Valid Photos and Merchant number`)
        );
      } finally {
        try {
          deleteFile(file1.filepath);
        } catch (error) {}
        try {
          deleteFile(file2.filepath);
        } catch (error) {}
        try {
          deleteFile(file3.filepath);
        } catch (error) {}
      }
    })
    .on('fileBegin', function (name, file) {
      file.newFilename = uuid();
      file.filepath =
        path.join(__dirname, '../') +
        Date.now() +
        file.newFilename +
        '.' +
        file.mimetype.split('/').pop();
      console.log(file.filepath);
    })
    .on('file', function (name, file) {});
});

//get personal info of logged in user
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  try {
    let user;
    user = await User.findById(req.user.id).populate('drivers routes');

    res.status(200).json({
      success: true,
      user,
    });
    profiler.done({
      message: `User ${req.user.id} checked profile`,
    });
  } catch (error) {
    profiler.done({
      message: error,
      level: 'error',
      actionBy: req.user.id,
    });
  }
});

//add routes
exports.createRoute = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  if (req.body.formType) {
    profiler.done({
      message: 'cannot parse form data because its json',
      level: 'error',
      actionBy: req.user.id,
    });
    return next(new ErrorHandler('Please provide all Informations correctly'));
  }

  const busOwner = req.user;
  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.maxFileSize = 5 * 1024 * 1024; // 5MB
  form
    .parse(req, async (err, fields, files) => {
      if (err) {
        profiler.done({
          message: error,
          level: 'error',
          actionBy: req.user.id,
        });
        return res.status(400).json({
          status: 'Fail',
          message: 'There was an error parsing the files',
          error: err,
        });
      }
      const file1 = files.routePermit;
      const { routeName, stations, numberOfStations, layouts, info } = fields;
      try {
        if (
          isFileValid(file1) &&
          routeName &&
          stations &&
          numberOfStations &&
          layouts &&
          info
        ) {
          const stationsObject = JSON.parse(stations);
          const layout = JSON.parse(layouts);
          const information = JSON.parse(info);
          const routePermitProfiler = logger.startTimer();
          const resultOfRoutePermitUpload = await uploadFile(file1);
          routePermitProfiler.done({
            message: `Uploaded Route permit document by Authority ${busOwner.id}`,
          });

          const busRoute = await BusRoute.create({
            name: fields.routeName,
            stations: fields.numberOfStations,
            stationList: stationsObject,
            routePermitDoc: resultOfRoutePermitUpload.Key,
            authorityId: req.user.id,
            layouts: layout,
            info: information,
          });
          busOwner.routes.push(busRoute);
          busOwner.save();

          res.status(200).json({
            success: true,
            message: 'Bus Route added Successfully',
            route: busRoute,
          });

          profiler.done({
            message: `Created Route ${busRoute.id} by Authority ${busOwner.id}`,
          });
        } else {
          profiler.done({
            message: `Please upload Valid Route Permit Document`,
            level: 'error',
          });
          return next(
            new ErrorHandler(`Please provide all Informations correctly`)
          );
        }
      } catch (error) {
        profiler.done({
          message: error,
          level: 'error',
          actionBy: req.user.id,
        });
        return next(
          new ErrorHandler('Please provide all Informations correctly')
        );
      } finally {
        try {
          deleteFile(file1.filepath);
        } catch (error) {}
      }
    })
    .on('fileBegin', function (name, file) {
      file.newFilename = uuid();
      file.filepath =
        path.join(__dirname, '../') +
        Date.now() +
        file.newFilename +
        '.' +
        file.mimetype.split('/').pop();
      console.log(file.filepath);
    })
    .on('file', function (name, file) {});
});

//add Driver
exports.addDriver = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  if (req.body.formType) {
    profiler.done({
      message: 'cannot parse form data because its json',
      level: 'error',
      actionBy: req.user.id,
    });
    return next(new ErrorHandler('Please provide all Informations correctly'));
  }

  var form = new formidable.IncomingForm();
  form.multiples = true;
  form.maxFileSize = 5 * 1024 * 1024; // 5MB
  form
    .parse(req, async (err, fields, files) => {
      if (err) {
        profiler.done({
          message: error,
          level: 'error',
          actionBy: req.user.id,
        });

        return res.status(400).json({
          status: 'Fail',
          message: 'There was an error parsing the files',
          error: err,
        });
      }
      const { driverName, phoneNumber, licenseNumber, NIDNumber } = fields;
      const { drivingLicense, NIDBack, NIDFront, driverImage } = files;
      try {
        if (
          (isFileValid(drivingLicense) &&
            isFileValid(NIDBack) &&
            isFileValid(NIDFront) &&
            isFileValid(driverImage) &&
            driverName,
          phoneNumber,
          NIDNumber,
          licenseNumber)
        ) {
          var bodyFormData = new FormData();
          bodyFormData.append('driverName', driverName);
          bodyFormData.append('phoneNumber', phoneNumber);
          bodyFormData.append('NIDNumber', NIDNumber);
          bodyFormData.append('licenseNumber', licenseNumber);
          bodyFormData.append('owner', req.user.id);
          bodyFormData.append(
            'drivingLicense',
            fs.readFileSync(drivingLicense.filepath, 'utf-8'),
            drivingLicense.newFilename +
              '.' +
              drivingLicense.mimetype.split('/').pop()
          );
          bodyFormData.append(
            'NIDBack',
            fs.readFileSync(NIDBack.filepath, 'utf-8'),
            NIDBack.newFilename + '.' + NIDBack.mimetype.split('/').pop()
          );
          bodyFormData.append(
            'driverImage',
            fs.readFileSync(driverImage.filepath, 'utf-8'),
            driverImage.newFilename +
              '.' +
              driverImage.mimetype.split('/').pop()
          );
          bodyFormData.append(
            'NIDFront',
            fs.readFileSync(NIDFront.filepath, 'utf-8'),
            NIDFront.newFilename + '.' + NIDFront.mimetype.split('/').pop()
          );

          const newDriver = await axios
            .post(
              'http://18.213.177.252:8003/api/v1/driver/add',
              bodyFormData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              }
            )
            .catch(function (error) {
              try {
                if (error.errno == -111 || error.errno == -110) {
                  profiler.done({
                    message: 'Driver Service Not Responding',
                    level: 'error',
                    actionBy: req.user.id,
                  });
                  return next(
                    new ErrorHandler('Driver Service Not Responding')
                  );
                } else if (error.response.status == 400) {
                  profiler.done({
                    message: error.response.data.message,
                    level: 'error',
                    actionBy: req.user.id,
                  });
                  return next(new ErrorHandler(error.response.data.message));
                } else {
                  profiler.done({
                    message: error.response.data
                      ? error.response.data.message
                      : error,
                    level: 'error',
                    actionBy: req.user.id,
                  });

                  return next(
                    new ErrorHandler(
                      error.response.data
                        ? error.response.data.message
                        : error.message
                    )
                  );
                }
              } catch (error) {
                profiler.done({
                  message: error,
                  level: 'error',
                  actionBy: req.user.id,
                });

                return next(new ErrorHandler(error));
              }
            });
          if (newDriver) {
            const owner = req.user;
            owner.drivers.push(newDriver.data.driver);
            owner.save();
            res.status(200).json({
              success: true,
              message: 'Driver created successfully',
              driver: newDriver.data.driver,
            });
            profiler.done({
              message: `Created Driver ${newDriver.data.driver._id} by Authority ${owner.id}`,
            });
          } else {
            return next(
              new ErrorHandler(`Please provide all Informations correctly`)
            );
          }
        } else {
          profiler.done({
            message: `Please provide all Informations correctly`,
            level: 'error',
            actionBy: req.user.id,
          });
          return next(
            new ErrorHandler(`Please provide all Informations correctly`)
          );
        }
      } catch (error) {
        profiler.done({
          message: error,
          level: 'error',
          actionBy: req.user.id,
        });
        return next(new ErrorHandler(error.message ? error.message : error));
      } finally {
        try {
          deleteFile(drivingLicense.filepath);
          deleteFile(NIDBack.filepath);
          deleteFile(NIDFront.filepath);
          deleteFile(driverImage.filepath);
        } catch (error) {}
      }
    })
    .on('fileBegin', function (name, file) {
      file.newFilename = uuid();
      file.filepath =
        path.join(__dirname, '../') +
        Date.now() +
        file.newFilename +
        '.' +
        file.mimetype.split('/').pop();
    })
    .on('file', function (name, file) {});
});

exports.logout = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const user = req.user;
  const id = user.id;
  if (user) {
    user.loggedIn = false;
    user.save({ validateBeforeSave: false });
  }

  res.cookie('token', null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: 'Logged out',
  });
  profiler.done({
    message: 'Logged Out',
    level: 'info',
    actionBy: id,
  });
});

exports.getAllDrivers = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const ownerWithDrivers = await User.findById(req.user.id)
    .select('drivers')
    .populate('drivers');

  profiler.done({
    message: `Authority requested its drivers' information `,
    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    drivers: ownerWithDrivers.drivers,
  });
});
exports.getAllRoutes = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const ownerWithRoutes = await User.findById(req.user.id)
    .select('routes')
    .populate('routes');

  profiler.done({
    message: `Authority requested its drivers' information `,
    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    routes: ownerWithRoutes.routes,
  });
});

//add bus
exports.addBus = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  if (req.body.formType) {
    profiler.done({
      message: 'cannot parse form data because its json',
      level: 'error',
      actionBy: req.user.id,
    });
    return next(new ErrorHandler('Please provide all Informations correctly'));
  }

  if (req.user.routes.length == 0) {
    profiler.done({
      message: "Tried to add bus while there's no route added",
      level: 'error',
      actionBy: req.user.id,
    });
    return next(
      new ErrorHandler('Please add at least one route before adding Bus')
    );
  } else {
    var form = new formidable.IncomingForm();
    form.multiples = true;
    form.maxFileSize = 5 * 1024 * 1024; // 5MB
    form
      .parse(req, async (err, fields, files) => {
        if (err) {
          profiler.done({
            message: error,
            level: 'error',
            actionBy: req.user.id,
          });

          return res.status(400).json({
            status: 'Fail',
            message: 'There was an error parsing the files',
            error: err,
          });
        }
        const {
          busName,
          busLicenseNumber,
          engineNumber,
          seatLayout,
          routeId,
          seatNumber,
          ac,
        } = fields;
        const { routePermit, busLicenseDoc } = files;

        try {
          if (
            isFileValid(routePermit) &&
            isFileValid(busLicenseDoc) &&
            busName &&
            seatNumber &&
            busLicenseNumber &&
            engineNumber &&
            seatLayout &&
            routeId
          ) {
            var bodyFormData = new FormData();
            bodyFormData.append('busName', busName);
            bodyFormData.append('busLicenseNumber', busLicenseNumber);
            bodyFormData.append('ownerName', req.user.name);
            bodyFormData.append('engineNumber', engineNumber);
            bodyFormData.append('seatNumber', seatNumber);
            bodyFormData.append('seatLayout', seatLayout);
            bodyFormData.append('routeId', routeId);
            bodyFormData.append('owner', req.user.id);
            bodyFormData.append('ac', ac ? ac.toString() : 'false');
            bodyFormData.append(
              'routePermit',
              fs.readFileSync(routePermit.filepath, 'utf-8'),
              routePermit.newFilename +
                '.' +
                routePermit.mimetype.split('/').pop()
            );
            bodyFormData.append(
              'busLicenseDoc',
              fs.readFileSync(busLicenseDoc.filepath, 'utf-8'),
              busLicenseDoc.newFilename +
                '.' +
                busLicenseDoc.mimetype.split('/').pop()
            );

            const newBus = await axios
              .post('http://18.213.177.252:8004/api/v1/bus/add', bodyFormData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              })
              .catch(function (error) {
                if (error.errno == -111 || error.errno == -110) {
                  profiler.done({
                    message: 'Bus Service Not Responding',
                    level: 'error',
                    actionBy: req.user.id,
                  });
                  return next(new ErrorHandler('Bus Service Not Responding'));
                } else {
                  profiler.done({
                    message: error.response.data
                      ? error.response.data.message
                      : error,
                    level: 'error',
                    actionBy: req.user.id,
                  });

                  return next(
                    new ErrorHandler(
                      error.response.data
                        ? error.response.data.message
                        : error.message
                    )
                  );
                }
              });
            if (newBus) {
              const owner = req.user;
              owner.buses.push(newBus.data.bus);
              owner.save();
              res.status(200).json({
                success: true,
                message: 'Bus created successfully',
                bus: newBus.data.bus,
              });
              profiler.done({
                message: `Created Bus ${newBus.data.bus._id} by Authority ${owner.id}`,
              });
            }
          } else {
            profiler.done({
              message: `Please provide all Informations correctly`,
              level: 'error',
              actionBy: req.user.id,
            });
            return next(
              new ErrorHandler(`Please provide all Informations correctly`)
            );
          }
        } catch (error) {
          profiler.done({
            message: error,
            level: 'error',
            actionBy: req.user.id,
          });
          return next(
            new ErrorHandler('Please provide all Informations correctly')
          );
        } finally {
          try {
            deleteFile(routePermit.filepath);
            deleteFile(busLicenseDoc.filepath);
          } catch (error) {}
        }
      })
      .on('fileBegin', function (name, file) {
        file.newFilename = Date.now() + uuid();
        file.filepath =
          path.join(__dirname, '../') +
          file.newFilename +
          '.' +
          file.mimetype.split('/').pop();
      })
      .on('file', function (name, file) {});
  }
});

exports.getAllBuses = catchAsyncErrors(async (req, res, next) => {
  const profiler = logger.startTimer();
  const ownerWithBuses = await User.findById(req.user.id)
    .select('buses')
    .populate('buses');

  profiler.done({
    message: `Authority requested its bus' information `,
    level: 'info',
    actionBy: req.user.id,
  });
  res.status(200).json({
    success: true,
    buses: ownerWithBuses.buses,
  });
});

exports.checkValidBus = catchAsyncErrors(async (req, res, next) => {
  const { busLicenseNumber, engineNumber } = req.body;
  const validBusPayload = {
    busNo: busLicenseNumber,
    engNo: engineNumber,
  };

  const busValidity = await axios
    .post('http://18.213.177.252:8006/api/v1/crosscheck/bus', validBusPayload)
    .catch(function (error) {
      profiler.done({
        message: error,
        level: 'error',
        actionBy: owner,
      });
      return next(new ErrorHandler('Validation Service not Responding'));
    });
  if (busValidity.data.bus) {
    res.status(200).json({
      success: true,
      message: 'Bus Valid',
      seatNumber: busValidity.data.bus.seatNumber,
    });
  } else {
    res.status(400).json({ success: false, message: 'Bus Not Valid' });
  }
});
