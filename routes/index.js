var express = require("express");
var router = express.Router();

const LIST = {};

router.get("/", (req, res, next) => {
  return res.render("index", {
    LIST,
  });
});

router.post("/items", (req, res, next) => {
  if (!LIST[req.body.itemDate]) {
    // initial date
    LIST[req.body.itemDate] = {
      doing: [],
    };
  }

  LIST[req.body.itemDate].doing.push({
    text: req.body.itemText,
  });

  return res.redirect("/");
});

module.exports = router;
