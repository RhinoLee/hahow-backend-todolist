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
      done: [],
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

router.put("/items/state", (req, res, next) => {
  const { itemId, itemDate, itemState } = req.body;

  const idx = LIST[itemDate][itemState].findIndex((item) => item.id === itemId);

  if (idx === -1) {
    return res.json({
      success: false,
    });
  }

  const item = LIST[itemDate][itemState].splice(idx, 1)[0];
  const toState = itemState === "doing" ? "done" : "doing";

  LIST[itemDate][toState].push(item);

  return res.json({
    success: true,
    item,
    toState,
  });
});

module.exports = router;
