const app = require('./app');
const https = require('https');
const path = require('path');
const fs = require('fs');
const connectDatabase = require('./config/database');

//Handling Uncaught Exception

process.on('uncaughtException', (err) => {
  console.log(`Error ${err.message}`);
  console.log('Shutting down the server due to Uncaught Exception');
  process.exit(1);
});

// //config
// console.log('ENVIRONMENT: ' + process.env.NODE_ENV);

// if (process.env.NODE_ENV === 'debug')
//   dotenv.config({ path: 'config/config.env' });

//Connecting to database
connectDatabase();
const sslServer = https.createServer(
  {
    key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
    cer: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
  },
  app
);
sslServer.listen(process.env.BUSOWNERPORT, () =>
  console.log(`busowner is listening to localhost:${process.env.BUSOWNERPORT}`)
);

// Unhandled Promise Rejection

process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server due to unhandled promise rejection');
  server.close(() => {
    process.exit(1);
  });
});
