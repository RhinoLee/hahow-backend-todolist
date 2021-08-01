var express = require("express");
var uuidv4 = require("uuid").v4;

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
    id: uuidv4(),
    text: itemText,
  });

  return res.redirect("/");
});

router.post("/items/delete", (req, res, next) => {
  const idx = LIST[req.body.itemDate].doing.findIndex(
    (item) => item.id === req.body.itemId
  );

  LIST[req.body.itemDate].doing.splice(idx, 1);

  return res.redirect("/");
});

module.exports = router;
