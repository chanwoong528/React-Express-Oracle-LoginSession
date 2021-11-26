const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const PORT = 5000;
require("dotenv").config({ path: "../env/.env" });

const { body, validationResult } = require("express-validator");

const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo"); //just to store Session Info

const oracle = require("oracledb");
const dbConfig = {
  user: process.env.ORACLE_USERNAME,
  password: process.env.ORACLE_PASSWORD,
  connectionString: process.env.ORACLE_CONNECTIONSTRING,
};
let db;
oracle.getConnection(dbConfig, (error, connection) => {
  if (error) {
    console.log("OracleDB Connection Error 💥: ", error.message);
    return;
  }
  console.log("OracleDB 🚀");
  db = connection;
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//app.use(bodyParser.urlencoded({ extended: true })); //4.16version express⬆ has bodyParser
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3001"],
    methods: ["POST", "PUT", "GET"],
    credentials: true,
  })
);

app.use(
  session({
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      ttl: 1 * 24 * 60 * 60, //this is One day
    }),
    secret: process.env.MONGO_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 60 * 60 * 1000, //one hour
    },
    //5000 === 5sec
  })
);

//----------------------------validation ----------------------------
const schema = [
  body("userName").isLength({ min: 6, max: 10 }).withMessage("username: 6~10"),
  body("email").isEmail().withMessage("!valid email "),
  body("password").isLength({ min: 6, max: 10 }).withMessage("pw: 6~10"),
];
//validation function as middle ware
function registerVali(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errObj = errors.mapped(); //=> making it to be object {userName:''}
    console.log(errObj);
    return res.status(400).send({
      nameErr: errObj.userName,
      emailErr: errObj.email,
      pwErr: errObj.password,
    });
  }
  next();
}
//----------------------------validation ----------------------------

//----------------------------login middle ware-----------------------
async function isLoggedIn(req, res, next) {
  if (req.session.isLoggedIn && req.session.user) {
    next();
  } else {
    res.status(400).send({ error: "Did not login 🚫" });
  }
}

//------------------------Routers-------------------------------

app.get("/", (req, res) => {
  res.send("Hello World ");
});
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.send({ message: "logout Successful" });
});
//if Admin, give all the users
app.get("/users", isLoggedIn, async (req, res) => {
  console.log("getAllusers ses: ", req.session.user.userName);
  const loggedInUser = req.session.user.userName;
  // const user
  // const selectUsersQuery = "SELECT * FROM SCM_USER WHERE USERNAME != :1";
  const selectUsersQuery =
    "SELECT USERNAME, EMAIL,COMPANY FROM SCM_USER WHERE USERNAME != :1 ";
  const allUsers = await queryResult(selectUsersQuery);
  function queryResult(query) {
    return new Promise((resolve, reject) => {
      db.execute(
        query,
        [loggedInUser],
        { outFormat: oracle.OUT_FORMAT_OBJECT },
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result.rows);
          }
        }
      );
    });
  }
  if (allUsers) {
    res.status(200).send(allUsers);
  } else {
    res.status(500).send({ message: "Something wrong with db" });
  }
});
//create User
app.post("/user", schema, registerVali, async (req, res) => {
  const salt = await bcrypt.genSalt(10);
  const userName = req.body.userName;
  const email = req.body.email;
  const company = req.body.company;
  const password = await bcrypt.hash(req.body.password, salt);

  console.log("UserInfo Client Reg: ", userName, email, company, password);
  const insertUserQuery =
    "INSERT INTO SCM_USER(USERNAME, EMAIL,COMPANY,PASSWORD) VALUES (:1, :2, :3, :4)";
  await db.execute(
    insertUserQuery,
    [userName, email, company, password],
    (err, result) => {
      if (err) {
        res.status(500).send({ message: `Cannot Insert User: ${userName}❌` });
      }
      console.log(`Inserted User  ${userName} succeed! 👌`);
      db.commit();
      res
        .status(201)
        .send({ message: `Inserted User  ${userName} succeed! 👌` });
    }
  );
});

app.get("/login", (req, res) => {
  console.log("getLogin ses.user:  ", req.session.user);
  console.log("getLogin ses.isLogIn?:  ", req.session.isLoggedIn);
  if (req.session.user) {
    res.send({ isLoggedIn: true, user: req.session.user });
  } else {
    res.send({ isLoggedIn: false });
  }
});

//login User.
app.post("/login", async (req, res) => {
  const userName = req.body.userName;
  const password = req.body.password;
  console.log("UserInfo Client Login: ", userName, password);
  const getPWQuery = "SELECT * FROM SCM_USER WHERE USERNAME = :1";
  const User = await queryResult(getPWQuery, userName);

  function queryResult(query, userName) {
    return new Promise((resolve, reject) => {
      db.execute(
        query,
        [userName],
        { outFormat: oracle.OUT_FORMAT_OBJECT },
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(...result.rows);
          }
        }
      );
    });
  }
  if (User) {
    console.log("USER exists 😁");
    const comparePW = await bcrypt.compare(password, User.PASSWORD);

    if (comparePW) {
      //----------------------session ---------------------------
      console.log("USER can Login 😍");
      console.log("USER: ", User);
      console.log("session::    ", req.session);
      const sessionUser = {
        userName: User.USERNAME,
        email: User.EMAIL,
        company: User.COMPANY,
      };
      req.session.user = sessionUser;
      req.session.isLoggedIn = true;
      console.log("session:User:    ", req.session.user);
      console.log("session:User:    ", req.session.isLoggedIn);
      res.status(200).send(User);
      //----------------------session ---------------------------
    } else {
      console.log("USER password not correct 🤬");
      res.status(401).send({ message: "USER password not correct 🤬" });
    }
  } else {
    console.log("USER not exists 🥵");
    res.status(401).send({ message: "USER not exists 🥵" });
  }
});
//------------------------Routers-------------------------------
app.listen(PORT, () => {
  console.log(`Server 🚀: ${PORT}`);
});
