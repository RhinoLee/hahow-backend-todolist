const express = require("express");
const uuidv4 = require("uuid").v4;
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");
const redis = require("redis");
const { promisify } = require("util");

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DATABASE_NAME = process.env.MONGODB_DATABASE_NAME;
const REDIS_URL = process.env.REDIS_URL;

const client = new MongoClient(MONGODB_URL);

const redisClient = redis.createClient(REDIS_URL);

const rSet = promisify(redisClient.set).bind(redisClient);
const rGet = promisify(redisClient.get).bind(redisClient);
const rDel = promisify(redisClient.del).bind(redisClient);

const router = express.Router();

const getDb = async () => {
  await client.connect();

  return client.db(MONGODB_DATABASE_NAME);
};

router.get("/", async (req, res, next) => {
  let LIST = await rGet("todo-list");

  if (!LIST) {
    const db = await getDb();

    LIST = await getDays(db);

    LIST = JSON.stringify(LIST);

    await rSet("todo-list", LIST);
  }

  LIST = JSON.parse(LIST);

  return res.render("index", {
    LIST,
  });
});

router.post("/items", async (req, res, next) => {
  const db = await getDb();

  const { itemText, itemDate } = req.body;

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

  await rDel("todo-list");

  return res.redirect("/");
});

router.post("/items/delete", async (req, res, next) => {
  const db = await getDb();

  await db.collection("TodoList").updateOne(
    {
      _id: req.body.itemDate,
    },
    {
      $pull: {
        [req.body.itemState]: {
          id: req.body.itemId,
        },
      },
    }
  );

  await rDel("todo-list");

  return res.redirect("/");
});

router.put("/items/state", async (req, res, next) => {
  const { itemDate, itemState, itemId } = req.body;

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

  const toState = itemState === "doing" ? "done" : "doing";

  const item = day[itemState][0];

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

  await rDel("todo-list");

  return res.success({
    item,
    toState,
  });
});

const getDays = async (db) => {
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
      done: day.done,
      doing: day.doing,
    };
  });

  return LIST;
};

module.exports = router;
