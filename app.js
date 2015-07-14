// Load dependencies
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// Start Express
var app = express();

// Setup view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Add app dependencies
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// GET route
app.get('/', function(req, res)
{

    // Check for CallID
    if(req.query.CallID)
    {

        app.emit('incomingCallEvent', req.query);
        res.sendStatus(200);

    }
    else
    {

        res.sendStatus(500);

    } // End if

});

// POST route
app.post('/', function(req, res)
{

    if(req.body.CallID)
    {

        app.emit('incomingCallEvent', req.body);
        res.sendStatus(200);

    }
    else
    {

        res.sendStatus(500);

    } // End if

});

// catch 404 and forward to error handler
app.use(function(req, res, next)
{

    var err = new Error('Not Found');
    err.status = 404;
    next(err);

});

// Development error handler - will print stacktrace
if (app.get('env') === 'development')
{

    app.use(function(err, req, res)
    {

        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });

    });

} // End if

// Production error handler - no stacktraces leaked to user
app.use(function(err, req, res)
{

    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });

});

// Export
module.exports = app;