var express = require("express");
var router = express.Router();

const LIST = {};

router.get("/", function (req, res, next) {
  console.dir(LIST);

  return res.render("index", {
    user: {
      name: "kewang",
    },
    LIST,
  });
});

router.post("/items", (req, res, next) => {
  const { itemDate, itemText } = req.body;

  if (!LIST[itemDate]) {
    // initial
    LIST[itemDate] = {
      doing: [],
    };
  }

  LIST[itemDate].doing.push({
    text: itemText,
  });

  return res.redirect("/");
});

module.exports = router;
