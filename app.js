//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");  //Level:2 Security
// const md5 = require("md5");        //Level:3 Security
// const bcrypt = require("bcrypt");  //Level:4 Security
// const saltRounds = 10;             //Level:4 Security
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

// console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));
  
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-soham:test123@secret.p4ovg.mongodb.net/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
// mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// userSchema.plugin(encrypt,{secret:process.env.SECRET, encryptedFields:["password"]});    //Level:2 Security

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());     //local-mongoose
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    // callbackURL: "http://localhost:3000/auth/google/secrets",
    callbackURL: "https://shhsecret.herokuapp.com/login/auth/google",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
});

app.get("/login", function(req, res){
    res.render("login");
});
  
  app.get("/register", function(req, res){
    res.render("register");
});

 app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
    });
  });

  app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  });
  
  app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
  
  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
    // console.log(req.user.id);
  
    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  });


// app.post("/register", function(req, res){  //Level:4 security (Entire register route)

//     bcrypt.hash(req.body.password,saltRounds,function(err,hash){
//         const newUser=new User({
//             email:req.body.username,
//             // password: md5(req.body.password) //Level:3
//             password: hash 
//         });
     
//         newUser.save(function(err){
//             if(err){
//                 console.log(err);
//             }else{
//                 res.render("secrets");
//             }
//         });
//     })
// });

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
          });
        }
      });
});

// app.post("/login", function(req, res){    //Level:4 Security (Entire login route)

//     const username= req.body.username;
//     // const password= md5(req.body.password);  //Level:3
//     const password = req.body.password;
    
//     User.findOne({email:username},function(err,foundUser){
//         if(err){
//             console.log(err);
//         }else{
//             if(foundUser){
//                 // if(foundUser.password===password){
//                 //     res.render("secrets");
//                 // }

//                 bcrypt.compare(password,foundUser.password,function(err,result){
//                     if(result===true){
//                         res.render("secrets");
//                     }
//                 })
//             }
//         }
//     });

// });

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    
    req.login(user, function(err){
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
          });
        }
    });
});



app.listen(process.env.PORT || 3000,function(){
  console.log("Server started on port 3000");
})