require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { createClient } = require("redis");
const { RedisStore } = require("connect-redis");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const client = createClient({
  username: "manavb",
  password: "Manav!12",
  socket: {
    host: "redis-15201.c14.us-east-1-3.ec2.cloud.redislabs.com",
    port: 15201,
  },
});
client.connect().catch(console.error);

const redisStore = new RedisStore({
  client: client,
  prefix: "passlock:",
  ttl: 86400,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

const requireAuth = (req, res, next) => {
  if (req.session.user) next();
  else res.redirect("/index.html");
};

app.get(["/index.html", "/"], (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);
app.get("/signup.html", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "signup.html"))
);
app.get("/generator.html", requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, "public", "generator.html"))
);
app.get("/manager.html", requireAuth, (req, res) =>
  res.sendFile(path.join(__dirname, "public", "manager.html"))
);

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  try {
    await client.hSet(`user:${username}`, {
      password: hash,
      entries: JSON.stringify([]),
    });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: "Username exists" });
  }
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  const data = await client.hGetAll(`user:${username}`);
  if (data.password && (await bcrypt.compare(password, data.password))) {
    req.session.user = username;
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.get("/api/entries", requireAuth, async (req, res) => {
  const data = await client.hGet(`user:${req.session.user}`, "entries");
  res.json(JSON.parse(data || "[]"));
});

app.post("/api/entries", requireAuth, async (req, res) => {
  const { app, user, pass } = req.body;
  const data = await client.hGet(`user:${req.session.user}`, "entries");
  const entries = JSON.parse(data || "[]");
  entries.push({ app, user, pass });
  await client.hSet(
    `user:${req.session.user}`,
    "entries",
    JSON.stringify(entries)
  );
  res.json({ success: true });
});

app.put("/api/entries/:index", requireAuth, async (req, res) => {
  const index = parseInt(req.params.index);
  const { app, user, pass } = req.body;
  const data = await client.hGet(`user:${req.session.user}`, "entries");
  const entries = JSON.parse(data || "[]");
  if (entries[index]) {
    entries[index] = { app, user, pass };
    await client.hSet(
      `user:${req.session.user}`,
      "entries",
      JSON.stringify(entries)
    );
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.delete("/api/entries/:index", requireAuth, async (req, res) => {
  const index = parseInt(req.params.index);
  const data = await client.hGet(`user:${req.session.user}`, "entries");
  const entries = JSON.parse(data || "[]");
  if (entries[index]) {
    entries.splice(index, 1);
    await client.hSet(
      `user:${req.session.user}`,
      "entries",
      JSON.stringify(entries)
    );
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
