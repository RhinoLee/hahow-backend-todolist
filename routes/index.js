var express = require("express");
var uuidv4 = require("uuid").v4;
var dotenv = require("dotenv");
var redis = require("redis");
var { promisify } = require("util");
var { MongoClient } = require("mongodb");
var bcrypt = require("bcrypt");

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DATABASE_NAME = process.env.MONGODB_DATABASE_NAME;
const REDIS_URL = process.env.REDIS_URL;

const client = new MongoClient(MONGODB_URL);
const redisClient = redis.createClient(REDIS_URL);

const rGet = promisify(redisClient.get).bind(redisClient);
const rSet = promisify(redisClient.set).bind(redisClient);
const rDel = promisify(redisClient.del).bind(redisClient);

var router = express.Router();

const LIST = {};

const getDb = async () => {
  await client.connect();

  return client.db(MONGODB_DATABASE_NAME);
};

const getDays = async () => {
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

  return LIST;
};

router.get("/signup", async (req, res, next) => {
  return res.render("signup");
});

router.post("/signup", async (req, res, next) => {
  const db = await getDb();

  const { name, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  await db.collection("User").insertOne({
    name,
    password: hash,
  });

  return res.redirect("/");
});

router.get("/", async (req, res, next) => {
  console.time("get all");

  let LIST = await rGet("todo-list");

  if (LIST) {
    console.log("use Redis");
  } else {
    LIST = await getDays();

    LIST = JSON.stringify(LIST);

    await rSet("todo-list", LIST);

    console.log("use DB");
  }

  LIST = JSON.parse(LIST);

  console.timeEnd("get all");

  return res.render("index", {
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

  await rDel("todo-list");

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

  await rDel("todo-list");

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

  await rDel("todo-list");

  return res.success({
    item,
    toState,
  });
});

module.exports = router;
