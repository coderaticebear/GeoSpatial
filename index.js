require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const port = process.env.PORT || 8000;

const app = express();

const settings = require("./config/settings");
const db = settings.dbURL;

mongoose
  .connect(db)
  .then(() => {
    app.listen(port, () => console.log(`App running at port ${port}`))

  })
  .catch((err) => console.log(err));




const shipwrecks = require("./routes/api/geospatial");
app.use("/api/shipwrecks", shipwrecks);

