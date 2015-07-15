#!/usr/bin/env node

// Load dependencies for server
var fs = require('fs');
var app = require('./app');
var debug = require('debug')('eAgent Server:server');
var https = require('https');
var net = require('net');
var privateKey  = fs.readFileSync('/srv/www/eagent_server/shared/config/ssl.key', 'utf8');
var certificate = fs.readFileSync('/srv/www/eagent_server/shared/config/ssl.crt', 'utf8');
var caBundle = fs.readFileSync('/srv/www/eagent_server/shared/config/ssl.ca', 'utf8');

var credentials = {key: privateKey, cert: certificate, ca: caBundle};
// Get port from environment and store in Express.
var port = normalizePort(process.env.PORT || '443');
app.set('port', port);

// Create HTTPS server
var server = https.createServer(credentials, app);

// Listen on provided port, on all network interfaces.
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Listing for incoming events
app.on('incomingCallEvent', onIncomingCall);

/**
 * Setup socket server
 */
// Keep track of the socket clients
var arrClients = [];

// Start a TCP Socket Server
var socketServer = net.createServer(function (socket)
{

    // Handle incoming messages from clients.
    socket.on('data', function (data)
    {

        // Check for data
        if(data)
        {

            // Split into parts
            console.log('Incoming socket data: ' + data);
            var arrDataParts = data.toString().split(' ');
            var strCommand = arrDataParts[0];

            // Client is identifying themselves
            if (strCommand == 'IDENTIFY_EXTENSION')
            {

                // Setup local vars
                var strClientKey = arrDataParts[1].toString();
                var strExtensionKey = arrDataParts[2].toString();

                // Assign to socket
                socket.sClientID = strClientKey;
                socket.sExtensionNum = strExtensionKey;

                console.log('Adding socket with Client ID: ' + arrDataParts[1] + ' and Extension: ' + arrDataParts[2]);

                // Check for client key in clients array
                if(!arrClients[strClientKey])
                {

                    arrClients[strClientKey] = [];

                } // End if

                // Add socket to array
                arrClients[strClientKey].push(socket);

            }
            else if(strCommand == 'PING')
            {

                // Respond to heartbeat
                socket.write('PONG');

            } // End if

        } // End if

    });

    // Remove the client from the list when it leaves
    socket.on('close', function ()
    {

        console.log('Socket closed');
        removeSocket(socket);

    });

    // Remove the client from the list when it leaves
    socket.on('end', function ()
    {

        console.log('Socket ending');
        removeSocket(socket);

    });

    // Error handler
    socket.on('error', function (error)
    {

        console.log('Socket error %o', error);

    });

}).listen(80).on('listening', onSocketServerListening);

/**
 * Broadcast message to specific extension
 *
 * @param   strClientID             Extension's ClientID
 * @param   strExtensionNumber      Extension number
 * @param   strMessage              Message to send
 */
function broadcastToExtension(strClientID, strExtensionNumber, strMessage)
{

    console.log('Broadcasting to Extension: ' + strExtensionNumber + ' under Client ID: ' + strClientID);

    // Check if ClientID exists
    if(Array.isArray(arrClients[strClientID]))
    {

        // Iterate client's socket connections
        arrClients[strClientID].every(function(socSocket)
        {

            // Check if extension numbers match
            if(socSocket.sExtensionNum == strExtensionNumber)
            {

                // Write message & exit loop
                socSocket.write(strMessage);
                return false;

            }
            else
            {

                // Continue loop
                return true;

            } // End if

        });

    } // End if

} // End function

/**
 * Normalize a port into a number, string, or false.
 *
 * @param   val
 * @returns {*}
 */
function normalizePort(val)
{

    var port = parseInt(val, 10);

    if (isNaN(port))
    {

        // named pipe
        return val;

    } // End if

    if (port >= 0)
    {

        // port number
        return port;

    } // End if

    return false;

} // End function normalizePort

/**
 * Event listener for HTTPS server "error" event.
 *
 * @param error
 */
function onError(error)
{

    if (error.syscall !== 'listen')
    {

        throw error;

    } // End if

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code)
    {

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

    } // End switch

} // End function onError

/**
 * Handler for when an incoming call is received
 *
 * @param   objCallData
 * @return  void
 */
function onIncomingCall(objCallData)
{

    var arrExtensionParts = objCallData.CalledExtension.split('*');
    broadcastToExtension(arrExtensionParts[0], arrExtensionParts[1], JSON.stringify(objCallData));

} // End function onIncomingCall

/**
 * Event listener for HTTPS server "listening" event.
 *
 * @return  void
 */
function onListening()
{

    console.log('Express server started on port %s at %s', server.address().port, server.address().address);

    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;

    debug('Listening on ' + bind);

} // End function onListening

/**
 * Handler for when the socket server starts
 *
 * @return  void
 */
function onSocketServerListening()
{

    console.log('Socket server started on port %s at %s', socketServer.address().port, socketServer.address().address);

} // End function onSocketServerListening

/**
 * Remove socket from array
 *
 * @param socket
 * @return  void
 */
function removeSocket(socket)
{

    // Look for ClientID in array
    if(arrClients[socket.sClientID].indexOf(socket) > -1)
    {

        console.log('Removing socket from array at position: ' + arrClients[socket.sClientID].indexOf(socket));

        // Remove socket
        arrClients[socket.sClientID].splice(arrClients[socket.sClientID].indexOf(socket), 1);

    } // End if

} // End function removeSocket