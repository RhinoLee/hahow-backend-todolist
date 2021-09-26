var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { 
    user: {
      name: "Rhino"
    },
    todos: [
      {
        title: "瑜珈一小時"
      },
      {
        title: "想一個SideProject"
      },
      {
        title: "線上課程看一單元"
      },
    ],
    doneTodos: [
      {
        title: "背10個單字"
      },
      {
        title: "整理書櫃"
      },
      {
        title: "寫一篇文章"
      },
    ],
  });
});



module.exports = router;
