#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('./app');
var debug = require('debug')('eAgent Server:server');
var http = require('http');
var net = require('net');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '80');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

app.on('incomingCallEvent', onIncomingCall);

function onIncomingCall(objCallData)
{

    var arrExtensionParts = objCallData.CalledExtension.split('*');
    broadcastToExtension(arrExtensionParts[0], arrExtensionParts[1], JSON.stringify(objCallData));

}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/**
 * Setup socket server
 */

// Keep track of the chat clients
var clients = [];

// Start a TCP Server
net.createServer(function (socket) {

  // Handle incoming messages from clients.
  socket.on('data', function (data) {

    // Check for data
    if(data) {

      // Split into parts
      var arrDataParts = data.split(' ');
      var strCommand = arrDataParts[0];

      // Client is identifying themselves
      if (strCommand == 'IDENTIFY_CLIENT') {
        if (!clients[arrDataParts[1]])
        {
          clients[arrDataParts[1]] = [];
        }
        console.log('Adding socket with Client ID: ' + arrDataParts[1] + ' and Extension: ' + arrDataParts[2]);
        clients[arrDataParts[1]][arrDataParts[2]] = socket;
      }

    }

  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    clients.every(function(arrClient) {
      if(arrClient.indexOf(socket) > -1)
      {
        arrClient.splice(arrClient.indexOf(socket), 1);
        return false;
      } else {
        return true;
      }
    });
  });

}).listen(81);

// Send message to all extensions belonging to a specific client
/*
function broadcastToClient(strClientID, strMessage)
{
    console.log('Broadcsting to Client ID: ' + strClientID);
    if(Array.isArray(clients[strClientID]))
    {
        clients[strClientID].forEach(function (socSocket) {
            socSocket.write(strMessage);
        });
    }
}
*/

// Send message to specific extension
function broadcastToExtension(strClientID, strExtensionNumber, strMessage)
{
    console.log('Broadcasting to Extension: ' + strExtensionNumber + ' under Client ID: ' + strClientID);
    if(Array.isArray(clients[strClientID]))
    {
        if(strExtensionNumber in clients[strClientID])
        {
            clients[strClientID][strExtensionNumber].write(strMessage);
        }
    }
}

// Put a friendly message on the terminal of the server.
console.log("Socker server running at port 81\n");