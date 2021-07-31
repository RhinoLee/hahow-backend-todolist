var express = require("express");
var uuidv4 = require("uuid").v4;
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
      done: [],
    };
  }

  LIST[req.body.itemDate].doing.push({
    id: uuidv4(),
    text: req.body.itemText,
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
  const { itemDate, itemState, itemId } = req.body;

  const idx = LIST[itemDate][itemState].findIndex((item) => item.id === itemId);

  if (idx === -1) {
    return res.fail();
  }

  const item = LIST[itemDate][itemState].splice(idx, 1)[0];
  const toState = itemState === "doing" ? "done" : "doing";

  LIST[itemDate][toState].push(item);

  return res.success({
    item,
    toState,
  });
});

module.exports = router;
