// Module dependencies
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var errorHandler = require('error-handler');

var config = {};
var app = express();
app.use(express.static(__dirname + '/public')); //setup static public directory
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(errorHandler);

// Jade
app.set('views',path.join(__dirname, 'views')); //optional since express defaults to CWD/views
app.set('view engine','jade');

app.all('*', function(req,res,next) {
    req.config = config;
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

// Error Handling
app.use(function(err, req, res, next) {
    console.log(err);
    next(err);
});

// Ajax calls
var WatsonUtils = require('./javascript/watson');
config.watson = new WatsonUtils(app,config);

// Routes for Views
var indexJS = require('./routes/index');
app.use('/',indexJS);
var settingsJS = require('./routes/settings');
app.use('/settings',settingsJS);

var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 3000);

// Start server
console.log("Starting server on port " + port)
app.listen(port, host);
