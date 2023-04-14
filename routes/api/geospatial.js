const express = require("express");
const router = express();
var path = require("path");
const bodyParser = require("body-parser");
const Geospatial = require("./../../models/Geospatial");
const Person = require("./../../models/Person");
const exphbs = require("express-handlebars");

const bcrypt = require("bcryptjs");
var cookie = require("cookie-parser");
const jsonwt = require("jsonwebtoken");
const passport = require("passport");

const settings = require("../../config/settings");
var randomstring = require("randomstring");
require("../../strategies/jsonwtStrategy")(passport);
router.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
  })
);
router.use(cookie());
// Setting the view engine to use Handlebars for rendering templates.
router.set("view engine", ".hbs");
router.use(bodyParser.urlencoded({ extended: false }));
router.use(express.static(path.join(__dirname, "public")));
router.use(express.urlencoded());
router.get("/", (req, res) => {
  res.send("Yay, you are connected");
});

router.get("/data/form", (req, res) => {
  res.render("form", {
    title: "Form UI",
  });
});

router.post("/register", (req, res) => {
  // check if username is already in collection.
  Person.findOne({ username: req.body.username })
    .then((person) => {
      if (person) {
        res.status(400).send("Username already there.");
      } else {
        const person = Person({
          name: req.body.name,
          username: req.body.username,
          password: req.body.password,
        });

        // encrypting the password using bcryptjs
        bcrypt.genSalt(10, (err, salt) => {
          // salt is provided in salt variable.
          bcrypt.hash(person.password, salt, (err, hash) => {
            if (err) {
              return res.status(400).send("Not Registered, Contact Admin!");
            } else {
              // hashed password
              person.password = hash;

              // add new person with hashed password.
              person
                .save()
                .then((person) => res.send("add success"))
                .catch((err) => res.send(err.message));
            }
          });
        });
      }
    })
    .catch((err) => res.send(err));
});
router.post("/login", (req, res) => {
  username = req.body.username;
  password = req.body.password; // 123456

  // check if username is already in collection.
  Person.findOne({ username: req.body.username }).then((person) => {
    if (person) {
      // compare the password
      bcrypt
        .compare(password, person.password)
        .then((isCompared) => {
          if (isCompared) {
            // res.cookie('session_id', '123')
            // res.send('Login Success')

            // generate JWT
            const payload = {
              id: person.id,
              name: person.name,
              username: person.username,
            };

            // jsonwebtoken method used to create token.
            jsonwt.sign(
              payload,
              settings.secret,
              { expiresIn: 3600 },
              (err, token) => {
                console.log(err);

                // let responseData = {
                //     success: true,
                //     token: 'Bearer ' + token
                // }
                res.json({
                  success: true,
                  token: "Bearer " + token,
                });
                // res.header('Authorization', 'Bearer ' + token)
                // res.redirect('get')
              }
            );
          } else {
            res.status(401).send("Password is not correct");
          }
        })
        .catch();
    } else {
      res.status(400).send("Username is not there.");
    }
  });
});
router.get("/authRequest", (req, res) => {
  const payload = {
    auhtTime: Date.now(),
    randomstring: randomstring.generate(),
  };
  jsonwt.sign(payload, settings.secret, { expiresIn: 3600 }, (err, token) => {
    if (err) res.status(500).send(err);
    res.status(200).json({
      success: true,
      token: "Bearer " + token,
    });
  });
});

router.post(
  "/data",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    //preprocess

    coordinate_one = parseFloat(req.body.coordinates[0]);
    coordinate_two = parseFloat(req.body.coordinates[1]);

    coordinatesArray = [];
    coordinatesArray.push(coordinate_one);
    coordinatesArray.push(coordinate_two);
    const shipWreckData = Geospatial({
      recrd: req.body.recrd,
      vesslterms: req.body.vesslterms,
      feature_type: req.body.feature_type,
      chart: req.body.chart,
      latdec: req.body.latdec,
      londec: req.body.londec,
      gp_quality: req.body.gp_quality,
      depth: req.body.depth,
      sounding_type: req.body.sounding_type,
      history: req.body.history,
      quasou: req.body.quasou,
      watlev: req.body.watlev,
      coordinates: coordinatesArray,
    });

    await shipWreckData
      .save()
      .then((shipWreckData) => {
        res.status(200).json(shipWreckData);
      })
      .catch((err) => {
        res
          .status(500)
          .send("Some error occured while saving shipwreckdata<br>" + err);
      });
  }
);

router.post("/data/submitData", async (req, res) => {
  let searchQuery = {};
  let perPage = req.body.perPage || 10;
  let page = parseInt(req.body.page) || 1;
  if (req.body.depth) {
    searchQuery.depth = req.body.depth;
  }
  await Geospatial.find(searchQuery)
    .lean()
    .limit(perPage)
    .skip(perPage * (page - 1))
    .then((shipWreckData) => {
      res.render("result", {
        title: "Result",
        data: shipWreckData,
      });
    })
    .catch((err) => {
      res.status(500).send("Some error while fetching data" + err);
    });
});
router.get(
  "/data/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let searchQuery = {};
    let perPage = req.query.perPage || 10;
    let page = parseInt(req.query.page) || 1;
    if (req.query.depth) {
      searchQuery.depth = req.query.depth;
    }

    if (req.params.id) {
      searchQuery._id = req.params.id;
    }
    await Geospatial.find(searchQuery)
      .limit(perPage)
      .skip(perPage * (page - 1))
      .then((shipWreckData) => {
        res.status(200).json(shipWreckData);
      })
      .catch((err) => {
        res.status(500).send("Some error while fetching data" + err);
      });
  }
);
router.get(
  "/data",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let searchQuery = {};
    let perPage = req.query.perPage || 10;
    let page = parseInt(req.query.page) || 1;
    if (req.query.depth) {
      searchQuery.depth = req.query.depth;
    }

    if (req.params.id) {
      searchQuery._id = req.params.id;
    }
    await Geospatial.find(searchQuery)
      .limit(perPage)
      .skip(perPage * (page - 1))
      .then((shipWreckData) => {
        res.status(200).json(shipWreckData);
      })
      .catch((err) => {
        res.status(500).send("Some error while fetching data" + err);
      });
  }
);
router.put(
  "/data/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let filters = {};
    let putData = {};

    if (req.params.id) {
      filters._id = req.params.id;
    }
    if (req.body.recrd) {
      putData.recrd = req.body.recrd;
    }
    if (req.body.vesslterms) {
      putData.vesslterms = req.body.vesslterms;
    }
    if (req.body.feature_type) {
      putData.feature_type = req.body.feature_type;
    }
    if (req.body.chart) {
      putData.chart = req.body.chart;
    }
    if (req.body.latdec) {
      putData.latdec = req.body.latdec;
    }
    if (req.body.londec) {
      putData.londec = req.body.londec;
    }
    if (req.body.gp_quality) {
      putData.gp_quality = req.body.gp_quality;
    }
    if (req.body.depth) {
      putData.depth = req.body.depth;
    }
    if (req.body.sounding_type) {
      putData.sounding_type = req.body.sounding_type;
    }
    if (req.body.history) {
      putData.history = req.body.history;
    }
    if (req.body.quasou) {
      putData.quasou = req.body.quasou;
    }
    if (req.body.watlev) {
      putData.watlev = req.body.watlev;
    }
    if (req.body.coordinates.length > 0) {
      let coordinate_one = parseFloat(req.body.coordinates[0]);
      let coordinate_two = parseFloat(req.body.coordinates[1]);
      let coordinatesArray = [];
      coordinatesArray.push(coordinate_one);
      coordinatesArray.push(coordinate_two);
      putData.coordinates = coordinatesArray;
    }
    await Geospatial.updateOne(filters, { $set: putData })
      .then((shipWreckData) => {
        res.status(200).json(shipWreckData);
      })
      .catch((err) => {
        res
          .status(500)
          .send(
            "Some error occured while updating the shipwreck data -- " + err
          );
      });
  }
);

router.delete(
  "/data/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let _id = req.params.id;

    await Geospatial.deleteOne({ _id: _id })
      .then((data) => {
        res.status(200).send("Delete successfull");
      })
      .catch((err) => {
        res.status(404).send(`Not Found`);
      });
  }
);
module.exports = router;
