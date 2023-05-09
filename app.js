//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");


const app = express();


app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/userDB");
  console.log("connected to mongo");
};

const userSchema = new mongoose.Schema(
    {
      email: String,
      password: String

    });

const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields:["password"] });

const User = mongoose.model("User", userSchema);

app.get("/", function(req,res){
    res.render("home")
});
app.get("/login", function(req,res){
    res.render("login")
});
app.get("/register", function(req,res){
    res.render("register")
});

app.post("/register", async function (req, res) {
    const newUser = new User({
      email: req.body.username,

      password: req.body.password,
    })

    try {
        
      await newUser.save();
        console.log(req.body);
      res.render("secrets");
    } catch (error) {
      res.send(error);
    }
  });

  app.post("/login", async function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    try {
         const foundUser = await User.findOne({email: username})
         if (foundUser.password === password){
            res.render("secrets");
         }
    } catch (error) {
        res.status(400).json({
            message: "Something is going wrong",
          });
    }
  })




app.listen(3000, function () {
    console.log("Server started on port 3000");
  });