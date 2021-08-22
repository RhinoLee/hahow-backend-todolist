var express = require("express");
var uuidv4 = require("uuid").v4;
var dotenv = require("dotenv");
var { MongoClient } = require("mongodb");

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DATABASE_NAME = process.env.MONGODB_DATABASE_NAME;

const client = new MongoClient(MONGODB_URL);

var router = express.Router();

const LIST = {};

const getDb = async () => {
  await client.connect();

  return client.db(MONGODB_DATABASE_NAME);
};

router.get("/", async (req, res, next) => {
  const db = await getDb();

  const days = await db
    .collection("TodoList")
    .find()
    .sort({
      _id: -1,
    })
    .toArray();

  const LIST = {};

  days.forEach((day) => {
    LIST[day._id] = {
      doing: day.doing,
      done: day.done,
    };
  });

  return res.render("index", {
    user: {
      name: "kewang",
    },
    LIST,
  });
});

router.post("/items", async (req, res, next) => {
  const { itemDate, itemText } = req.body;

  const db = await getDb();

  const day = await db.collection("TodoList").findOne({
    _id: itemDate,
  });

  const item = {
    id: uuidv4(),
    text: itemText,
  };

  if (day) {
    await db.collection("TodoList").updateOne(
      {
        _id: itemDate,
      },
      {
        $push: {
          doing: item,
        },
      }
    );
  } else {
    await db.collection("TodoList").insertOne({
      _id: itemDate,
      doing: [item],
      done: [],
    });
  }

  return res.redirect("/");
});

router.post("/items/delete", async (req, res, next) => {
  const { itemDate, itemId, itemState } = req.body;

  const db = await getDb();

  await db.collection("TodoList").updateOne(
    {
      _id: itemDate,
    },
    {
      $pull: {
        [itemState]: {
          id: itemId,
        },
      },
    }
  );

  return res.redirect("/");
});

router.put("/items/state", async (req, res, next) => {
  const { itemId, itemDate, itemState } = req.body;

  const db = await getDb();

  const day = await db.collection("TodoList").findOne({
    _id: itemDate,
    [itemState]: {
      $elemMatch: {
        id: itemId,
      },
    },
  });

  if (!day) {
    return res.fail();
  }

  await db.collection("TodoList").updateOne(
    {
      _id: itemDate,
    },
    {
      $pull: {
        [itemState]: {
          id: itemId,
        },
      },
    }
  );

  const item = day[itemState][0];

  const toState = itemState === "doing" ? "done" : "doing";

  await db.collection("TodoList").updateOne(
    {
      _id: itemDate,
    },
    {
      $push: {
        [toState]: item,
      },
    }
  );

  return res.success({
    item,
    toState,
  });
});

module.exports = router;
