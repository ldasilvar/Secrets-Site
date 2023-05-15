//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require('mongoose-findorcreate')
const FacebookStrategy = require('passport-facebook').Strategy;



const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "My Super Secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/userDB");
  console.log("connected to mongo");
}

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });



  passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID,
    clientSecret: process.env.FB_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function (accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
        facebookId: profile.id
    }, function (err, user) {
        return cb(err, user);
    });
}
)); 
passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile)
    User.findOrCreate({username: profile.displayName, googleId: profile.id, facebookId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

app.get("/", function (req, res) {
  res.render("home");
});
app.get('/auth/facebook',
    passport.authenticate('facebook'));
 
app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });
app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] })
);
app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));
app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("login");
  }
});

app.get("/logout", function (req, res) {
  req.logOut(function (err) {
    if (err) {
      console.log("##### Error when logging out");
    } else {
      res.redirect("/");
    }
  });
});

app.post("/register", async function (req, res) {
  User.register(
    { username: req.body.username, active: false },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", async function (req, res) {
  const user = new User({
    username: req.body.username,

    password: req.body.password,
  });

  passport.authenticate("local")(req, res, function () {
    req.login(user, function (err) {
      if (err) {
        console.log(err);
      }
    });
    res.redirect("/secrets");
  });
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});


/////////////WORKING CODE FOR POST ROUTES IF YOU WANT TO USE BCRYPT INSTEAD OF PASSPORT///////


// bcrypt.hash(req.body.password, saltRounds, async function(err, hash) {
//     const newUser = new User({
//         email: req.body.username,

//         password: hash
//       })

//       try {

//         await newUser.save();
//           console.log(req.body);
//         res.render("secrets");
//       } catch (error) {
//         res.send(error);
//       }
// });

// const username = req.body.username;
// const password = req.body.password;

// try {
//      const foundUser = await User.findOne({email: username})
//      if (foundUser){
//         bcrypt.compare(password, foundUser.password, function(err, result) {
//             if (result === true){
//                  res.render("secrets");
//             }
//         });

//      }
// } catch (error) {
//     res.status(400).json({
//         message: "Something is going wrong",
//       });
// }

// http://localhost:3000/auth/google/secrets