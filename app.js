var createError = require('http-errors');
var express = require('express');
var path = require('path');

var logger = require('morgan');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var indexRouter = require('./routes/index');
var exphbs  = require('express-handlebars');
var mongoose = require('mongoose');
var config = require('./DB_config');

mongoose.connect(config.development.mongodb_uri, function(err) {
  if (err) {
      console.log('连接失败');
  } else {
      console.log('连接成功');
  }
});

var app = express();

// view engine setup
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser('h-pool'))
app.use(session({
  secret: 'h-pool',
  cookie: { maxAge: 60 * 1000 * 300 } //过期时间 ms
}));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
