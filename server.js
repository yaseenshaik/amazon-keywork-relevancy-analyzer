var express = require("express");
var path = require("path");
var logger = require("morgan");
var compression = require("compression");
var methodOverride = require("method-override");
var session = require("express-session");
var flash = require("express-flash");
var bodyParser = require("body-parser");
var expressValidator = require("express-validator");
var dotenv = require("dotenv");
var nunjucks = require("nunjucks");

// Load environment variables from .env file
dotenv.load();

// Routes
var router = require("./routes");

var app = express();

// view engine setup
nunjucks.configure("views", {
  autoescape: true,
  watch: process.env.NODE_ENV === "development",
  express: app
});
app.set("view engine", "html");
app.set("port", process.env.PORT || 3000);
app.use(compression());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
  })
);
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));

app.use(router());

// Production error handler
if (app.get("env") === "production") {
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.sendStatus(err.status || 500);
  });
}

app.listen(app.get("port"), function() {
  console.log("Express server listening on port " + app.get("port"));
});

module.exports = app;
