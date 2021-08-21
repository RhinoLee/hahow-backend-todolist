const express = require("express");
const uuidv4 = require("uuid").v4;
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");
const redis = require("redis");
const { promisify } = require("util");
const bcrypt = require("bcrypt");
const axios = require("axios").default;

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DATABASE_NAME = process.env.MONGODB_DATABASE_NAME;
const REDIS_URL = process.env.REDIS_URL;
const CWB_API_KEY = process.env.CWB_API_KEY;

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

  let user;

  if (req.cookies.token) {
    user = {
      name: req.cookies.name,
    };
  }

  if (!LIST) {
    const db = await getDb();

    LIST = await getDays(db);

    LIST = JSON.stringify(LIST);

    await rSet("todo-list", LIST);
  }

  LIST = JSON.parse(LIST);

  const cwbData = await axios.get(
    `https://opendata.cwb.gov.tw/api/v1/rest/datastore/O-A0003-001?Authorization=${CWB_API_KEY}&stationId=466920`
  );

  const location = cwbData.data.records.location[0];

  const temp = location.weatherElement.find(
    (elem) => elem.elementName === "TEMP"
  ).elementValue;

  const info = location.weatherElement.find(
    (elem) => elem.elementName === "Weather"
  ).elementValue;

  return res.render("index", {
    LIST,
    user,
    weather: `${info} ${temp} 度C`,
  });
});

router.get("/signup", (req, res, next) => {
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

router.get("/login", (req, res, next) => {
  return res.render("login");
});

router.post("/login", async (req, res, next) => {
  const db = await getDb();

  const { name, password } = req.body;

  const user = await db.collection("User").findOne({
    name,
  });

  if (!user) {
    return res.render("login", {
      message: "無此使用者",
    });
  }

  const compareResult = await bcrypt.compare(password, user.password);

  if (!compareResult) {
    return res.render("login", {
      message: "密碼錯誤",
    });
  }

  const token = uuidv4();

  await db.collection("User").updateOne(
    {
      name,
    },
    {
      $set: {
        token,
      },
    }
  );

  res.cookie("token", token);
  res.cookie("name", user.name);

  return res.redirect("/");
});

router.get("/logout", async (req, res, next) => {
  const db = await getDb();

  const { name, token } = req.cookies;

  await db.collection("User").updateOne(
    {
      name,
    },
    {
      $unset: {
        token,
      },
    }
  );

  res.clearCookie("token");
  res.clearCookie("name");

  return res.redirect("/");
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
