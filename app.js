const express = require('express');
const app = express();
const path = require('path');
const userModel = require('./model/user');
const postModel = require('./model/post');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const user = require('./model/user');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.set("view engine", 'ejs');

app.get('/', function (req, res) {
   res.render('index');
})

app.get('/login', function (req, res) {
   res.render('login');
})

app.get('/profile', isLoggedIn, async function (req, res) {
   // console.log(req.user);
   let user = await userModel.findOne({ email: req.user.email }).populate("posts");
   res.render("profile", { user });
})

app.get('/like/:id', isLoggedIn, async function (req, res) {
   // console.log(req.user);
   let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    if(post.likes.indexOf(req.user.userid)=== -1){
      post.likes.push(req.user.uerid);
    }
    else{
      post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
   await post.save();
   res.redirect("/profile" );
})

app.get('/edit/:id', isLoggedIn, async function (req, res) {

   let post = await postModel.findOne({ _id: req.params.id }).populate("user"); 
   res.render("edit",{post});   
})
app.get('/comment/:id', isLoggedIn, async function (req, res) {

   let post = await postModel.findOne({ _id: req.params.id }).populate("user"); 
   res.render("comment",{post});   
})
app.post('/comment/:id', isLoggedIn, async function (req, res) {

   let post = await postModel.findOne({ _id: req.params.id }).populate("user"); 
   res.redirect("/comment");   
})

app.post('/update/:id', isLoggedIn, async function (req, res) {

   let post = await postModel.findOneAndUpdate({ _id: req.params.id },{content:req.body.content});
    
   res.redirect("/profile");   
})

app.post('/post', isLoggedIn, async function (req, res) {
   // console.log(req.user);
   let { content } = req.body;
   let user = await userModel.findOne({ email: req.user.email });
   let post = await postModel.create({
      user: user._id,
      content 
   });
   user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
})

app.post('/register', async function (req, res) {
   let { password, name, username, age, email } = req.body;
   let user = await userModel.findOne({ email: email });
   if (user) return res.status(500).send("User Already Exists");

   bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(password, salt, function (err, hash) {
         userModel.create({
            username,
            name,
            age,
            email,
            password: hash
         });

         let token = jwt.sign({ email: email }, "zain");
         res.cookie("token", token);
         res.redirect("/login");
      })
   })
})

app.post('/login', async function (req, res) {
   let { password, email } = req.body;

   let user = await userModel.findOne({ email });
   if (!user) return res.status(500).send("Something Went Wrong");

   bcrypt.compare(password, user.password, function (err, result) {
      if (result) {
         let token = jwt.sign({ email: email }, "zain");
         res.cookie("token", token);
         res.status(200).redirect("/profile");
      }
      else res.redirect("/login");
   })
})

app.get('/logout', function (req, res) {
   res.cookie("token", "");
   res.redirect("/login");
})

function isLoggedIn(req, res, next) {
   if (req.cookies.token === "") res.redirect("/login");
   else {
      let data = jwt.verify(req.cookies.token, "zain");
      req.user = data;
   }
   next();
}

app.listen(3000, () => {
   console.log("Port is Running");
});