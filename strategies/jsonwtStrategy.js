const JwtStrategy = require("passport-jwt").Strategy; // used to check things inside JWT
const ExtractJwt = require("passport-jwt").ExtractJwt; // used to extract things out of token
const mongoose = require("mongoose");
const Person = mongoose.model("myperson");

// getting setting
const settings = require("../config/settings");
const key = settings.secret;

var opts = {};
// JWT can be sent in many forms, other method to extract it fromHeader(), fromBodyField(), fromUrlQueryParameter()
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
// secret may be used to verify whether call is from right source or not.
//When you receive a JWT from the client, you can verify that JWT with this that secret key stored on the server.
opts.secretOrKey = key;

module.exports = (passport) => {
  // format of following callbacks
  // new JwtStrategy(options, verify).
  // 'verify' is a callback verify(jwt_payload, done)
  // 'done' is a callback done(error, user, info)
  passport.use(
    new JwtStrategy(opts, (jwt_payload, done) => {
      Person.findById(jwt_payload.id)
        .then((person) => {
          if (person) {
            return done(null, person);
          } else {
            return done(null, false);
          }
        })
        .catch((err) => console.log(err));
    })
  );
};
