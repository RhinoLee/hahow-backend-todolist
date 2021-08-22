var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");

var indexRouter = require("./routes/index");
var ExtendExpressMethod = require("./middlewares/extend-express-method");

var app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(ExtendExpressMethod);
app.use("/", indexRouter);

module.exports = app;
