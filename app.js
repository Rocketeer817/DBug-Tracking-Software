//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
var generator = require('generate-password');
const nodemailer =require("nodemailer");
var flash = require('express-flash');
const passportLocalMongoose = require("passport-local-mongoose");
const app = express();

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));

app.use(session({
  secret: 'Master of lord of mysteries',
  resave: false,
  saveUninitialized: true
}))

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/bugtrackingdb", { useNewUrlParser: true, useUnifiedTopology: true  });
mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);
const projectSchema = new mongoose.Schema ({
  name: { type: String},
})

const project = mongoose.model("project",projectSchema);
const employeeSchema = new mongoose.Schema ({
    username: {
        type: String,
        required: true,
        unique: true
      },
    name: {
        type: String,
        required: [true, "Please fill the details"]
      },
    email: {
        type: String,
        required: [true],
        unique: true
      },
    password: String,
    contact: {
        type: String,
        validate: {
        validator: function(v) {
            return /\d{10}/.test(v);
          },
          message: props => `${props.value} is not a valid phone number!`
        },
        required: [true, 'User phone number required']
      },
    role: {
     type: String,
     enum: ['developer', 'tester', 'manager']
      },
    projects: [projectSchema],
    noProject: {
      type: String,
      default: "0"
      }
  });

employeeSchema.plugin(passportLocalMongoose);
const user = mongoose.model("user",employeeSchema);

passport.use(user.createStrategy());
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

const bugSchema = new mongoose.Schema({
    bugId: {
      type: String,
      required: [true, "Please fill the details"],
      unique: true
    },
    projectId: {
      type: String,
      required: true,
      unique: true
    },
    project: {
        type : String
        //required : [true, "Please fill the details"]
    },
    category:{
        type : String,
    },
    severity : {
     type : String,
     enum : ['Low', 'Medium', 'High'],
    },
    status: {
        type: String,
        enum: ["To do", "In progress", "In review", "Fixed"]
    },
    reportedBy:{
        type: String
    },
    assignedTo:{
        type: String
    },
    openedDate: {
      type: String
    },
    dueDate: {
       type: String
    },
    description:{
       type: String
    },
    comments:[{
      commentname: String,
      comment: String
    }]
});

const bug = mongoose.model("bug",bugSchema);

const requestSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true},
  name: {
      type: String,
      required: [true, "Please fill the details"]
    },
  email: {
      type: String,
      required: [true],
    },
  contact: {
      type: String,
      validate: {
      validator: function(v) {
          return /\d{10}/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      },
      required: [true, 'User phone number required']
    },
  role: {
   type: String,
   enum: ['developer', 'tester', 'manager'],
    },
 })

const user1  = new user ({
    username: "Adm0001",
    name: "Gaurav Garg",
    email: "garggaurav460@gmail.com",
    contact: "9993041370",
    role: "manager",
    password: "password1"
});

user.find({},function(err, foundusers) {
  if(foundusers.length === 0){
    user.register({name: user1.name,email: user1.email,contact:user1.contact,
    role:user1.role,username:user1.username}, user1.password, function(err,user) {
      if(err){
        console.log(err);
        res.redirect("/signup");
      }else{
        console.log("Admin has been added to the database.")
    }
    });
  }
  else{
    console.log("Default users already added to the database");
  }
});

const request = mongoose.model("request",requestSchema);

//global variables
/*app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error = req.flash('error');
  next();
});*/
var fs = require("fs");
var text= fs.readFileSync("./text.txt", "utf-8");
var textByLine = text.split("\n");

//signup and login module.
app.get('/',function(req,res){
  res.render("login");
});

app.get('/signup',function(req,res){
  res.render("signup");
});

app.get('/forgotpassword',function(req,res){
    res.render("forgotpassword");
});

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
})

app.post("/signup",function(req, res){
  console.log(req.body.fname);

  let request1  = new request ({
    name: req.body.fname,
    role: req.body.role,
    username : req.body.username,
    email: req.body.email,
    contact: req.body.contact
  });
  request1.save();
  res.send("Your signup request has been sent to the admin.Please check your mail for approval.");
})

/*app.post("/",(req,res,next) =>{
  const userLogin = new user({
    username: req.body.username,
    password: req.body.password
  })
  req.login(userLogin, function(err){
    console.log(req.user.role);
    passport.authenticate('local',{
     successRedirect:'/'+req.user.role+"homepage",
     failureRedirect:'/',
     failureFlash:true
   })
   (req ,res,next);
 })
});*/

app.post("/", function(req, res) {
  const userLogin = new user({
    username: req.body.username,
    password: req.body.password
})

 req.login(userLogin, function(err){
   if(err){
     console.log(err);
     res.redirect("/");
   }else{
     console.log(userLogin);
     passport.authenticate("local")(req, res, function(){
     console.log(req.user.role);
     role = req.user.role ;
     let page = "/" + req.user.role + "homepage"
     res.redirect(page);
    })
   }
  })
 });

app.post("/forgotpassword", function(req,res) {
   console.log(req.body);
   user.findOne({email:req.body.email},function(err,u){
     if(err){
       res.json({success: false, message: 'Email is not correct.Please try again!'});
       res.redirect("/forgotpassword");
     }else{
     u.setPassword(req.body.new_password,function(err,u){
       if(err){
         res.json({success: false, message: 'Password could not be saved.Please try again!'});
       }
       else{
         u.save();
         res.redirect("/");
       }
     })
    }
  });
})



//manager module.

app.get("/managerhomepage",function(req,res) {
  if(req.isAuthenticated() ) {
    if(req.user.role === "manager") {
      console.log("running total bugs list for managerhomepage.");
      bug.find({},function(err, foundbugs){
        if(err){
          console.log(err);
        }
        else{
          console.log(req.user.name);
          res.render("managerhomepage",{buglist: foundbugs,name: req.user.name,username: req.user.username});
        }
      });
    }else {
      res.send("you are unauthorized to access this page")
     }
    }else {
    res.redirect("/");
  }
})

app.get("/buglist",function(req,res){
  if(req.isAuthenticated() ) {
    if(req.user.role === "manager"){
      console.log("running total bugs list for admin.");
      bug.find({},function(err, foundbugs){
        if(err){
          console.log(err);
        }
        else{
          console.log(foundbugs);
          console.log(req.user.name);
          res.render("buglist",{buglist:foundbugs,name: req.user.name,username: req.user.username});
        }
     });
   }else{
     res.send("you are unauthorized to access this page")
   }
  }else{
    res.redirect("/");
  }
})

app.get("/assign",function(req,res){
  if(req.isAuthenticated()) {
    if(req.user.role === "manager"){
        res.render("assign",{name: req.user.name,username: req.user.username});
    }else{
      res.send("you are unauthorized to access this page")
    }
  }else{
    res.redirect("/");
  }
})

app.get("/projectlistadmin", function(req,res) {
  if(req.isAuthenticated()) {
    if(req.user.role === "manager"){
    res.render("projectlistadmin",{name: req.user.name,username: req.user.username});
  }else{
   res.send("you are unauthorized to access this page")
}}else{
    res.redirect("/");
  }
})

app.get("/userlist",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.role === "manager"){
    console.log("running bugs list of tester.");
    user.find({},function(err, foundusers){
      if(err){
        console.log(err);
      }
      else{
        console.log(foundusers);
        console.log(req.user.name);
        res.render("userlist",{userlist:foundusers,name: req.user.name,username: req.user.username});
      }
   });
  }else{
   res.send("you are unauthorized to access this page")
  }
}else{
    res.redirect("/");
  }
})

app.get('/del/:variable', function(req,res){
  const r1 = req.params.variable;
  request.deleteOne({email : req.params.variable}, function(err){
   if(err){
      console.log(err);
    }else{
       console.log("deleted");
       console.log(r1);
       let transporter = nodemailer.createTransport({
         service:"gmail",
         auth:{
           user: "teamdynamicservice@gmail.com",
           pass:"passworddynamic"
         }

       });
       let mailOptions ={
         from:"teamdynamicservice@gmail.com",
         to:r1,
         subject: "Request denied for dynamic bug tracker",
         text:"You have been rejected by the admin."
       };
       transporter.sendMail(mailOptions, function(err,data){
         if(err){
           console.log("error2",err);
         }
         else{
           console.log("Mail is sent");
         }
       })
     }
   })
   res.redirect('/requests');
})

app.get('/acpt/:variable', function(req,res){
  request.find({name: req.params.variable},function(err, foundrequest){
      var r1 = foundrequest[0].email;
      var r2 = foundrequest[0].username;
      console.log(r1);
      var password = generator.generate({
          length: 10,
          numbers: true
        });
      console.log("password is:" + password);
      user.register({name: foundrequest[0].name,email: foundrequest[0].email,contact:foundrequest[0].contact,
      role:foundrequest[0].role,username:foundrequest[0].username},password, function(err,user) {
        if(err){
          console.log(err);
        }else{
            console.log(r1);
            let transporter = nodemailer.createTransport({
              service:"gmail",
              auth:{
                user: "teamdynamicservice@gmail.com",
                pass:"passworddynamic"
              }

            });
            let mailOptions ={
              from:"teamdynamicservice@gmail.com",
              to:r1,
              subject: "access details for dynamic bug tracker",
              text:"You have been accepted by the admin. Your login details are as follows:"+
              "username- "+r2+", password- "+password+" If you want to change password use forgot password option."
            };
            transporter.sendMail(mailOptions, function(err,data){
              if(err){
                console.log("error2",err);
              }
              else{
                console.log("Mail is sent");
              }
            });
          }
        })
      });
      request.deleteOne({name: req.params.variable}, function(err){
         if(err){
            console.log(err);
          }else{
             console.log("deleted");
           }
      })
   res.redirect('/requests');
})

app.get("/requests",function(req,res){
  if(req.isAuthenticated()){
   if(req.user.role === "manager"){
    request.find({},function(err, foundrequests){
        //console.log(foundusers.length);
      //  res.render("usersrequests",{requestsList:foundrequests});
         res.render("requests",{requestsList:foundrequests,name: req.user.name,username: req.user.username});
      });
   }else{
     res.send("you are unauthorized to access this page")
   }
 }else{
   res.redirect("/");
    }
});

app.get("/removeuser",function(req,res) {
  if(req.isAuthenticated()){
    if(req.user.role === "manager"){
      res.render("removeuser",{name: req.user.name,username: req.user.username});
    }else{
      res.send("you are trying to access unauthorized page.")
    }
  }else{
    res.redirect("/");
  }
})

app.post('/removeuser',function(req,res){
  console.log(req.body.username);
    user.findOne({username: req.body.username }, function (err, docs) {
      if (err){
          //req.flash()
          console.log("error1")
      }
      else{
        console.log(docs.email);
        let transporter = nodemailer.createTransport({
          service:"gmail",
          auth:{
            user: "teamdynamicservice@gmail.com",
            pass:"passworddynamic"
          }
        });
        let mailOptions ={
          from:"teamdynamicservice@gmail.com",
          to:docs.email,
          subject: "Removing access for user",
          text:" you have been removed "
        };
        transporter.sendMail(mailOptions, function(err,data){
          if(err){
            console.log("error2",err);
          }
          else{
            console.log("sent");
          }
        });
      }
    });

    user.findOneAndDelete({username: req.body.username},(err)=>{
      if(err){
        console.log(err)
      }else{
        console.log("deleted sucessfully");
        res.redirect("/removeuser");
      }
    })
  });

//developer module

app.get("/developerhomepage",function(req,res) {
  if(req.isAuthenticated() ) {
    if(req.user.role === "developer") {
      console.log("running total bugs list for managerhomepage.");
      bug.find({},function(err, foundbugs){
        if(err){
          console.log(err);
        }
        else{
          console.log(req.user.name);
          res.render("developerhomepage",{buglist: foundbugs,username: req.user.username,name:req.user.name});
        }
      });
    }else {
      res.send("you are unauthorized to access this page")
     }
    }else {
    res.redirect("/");
  }
})

app.get("/projectlistdev",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.role === "developer"){
      res.render("projectlistdev",{username: req.user.username, name: req.user.name })
    }else {
      res.send("you are unauthorized to access this page")
     }
    }else {
    res.redirect("/");
  }
})


//tester module

app.get("/testerhomepage",function(req,res) {
  if(req.isAuthenticated() ) {
    if(req.user.role === "tester") {
      console.log("running total bugs list for managerhomepage.");
      bug.find({},function(err, foundbugs){
        if(err){
          console.log(err);
        }
        else{
          console.log(req.user.name);
          res.render("testerhomepage",{buglist: foundbugs,name: req.user.name,username: req.user.username});
        }
      });
    }else {
      res.send("you are unauthorized to access this page")
     }
    }else {
    res.redirect("/");
  }
})

app.get("/projectlisttester",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.role === "tester"){
      res.render("projectlisttester",{name: req.user.name, username: req.user.username })
    }else {
      res.send("you are unauthorized to access this page")
    }
  } else {
    res.redirect("/");
  }
})

app.get("/reportbug",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.role === "tester"){
      res.render("reportbug",{texts: textByLine,username: req.user.username,name: req.user.name})
    }else {
      res.send("you are unauthorized to access this page")
    }
  }else {
    res.redirect("/");
  }
})

app.post("/reportbug",function(req,res){
  console.log(req.body);
  console.log(req.user.name);
  const op = req.user.name;
  const bug1 = new bug({
    bugId:req.body.bugId,
    projectId:req.body.projectId,
    category:req.body.category,
    severity:req.body.severity,
    status:"To do",
    reportedBy:op,
    description:req.body.description,
    openedDate:req.body.openedDate,
    dueDate:req.body.dueDate
  })
  bug1.save();
  res.redirect("/testerhomepage");
})

//profile pages for user and bug.

app.get("/userprofile/:variable",function(req,res){
  if(req.isAuthenticated()){
    user.find({username : req.params.variable},function(err, founduser){
      if(err){
        console.log(err);
      }
      else{
        res.render("userprofile",{user : founduser,name: req.user.name, username: req.user.username});
  //user.find gives founduser in an array. So when we try to access, founduser[i].username  this format should be used.
      }
   });
  }else{
    res.redirect("/");
  }
})

app.get("/edit/:variable",function(req,res){
  if(req.isAuthenticated()){
    user.find({username : req.params.variable},function(err, founduser){
      if(err){
        console.log(err);
      }
      else{
        res.render("userprofile-edit",{user : founduser,name: req.user.name, username: req.user.username});
      }
   });
  }else{
    res.redirect("/");
  }
});

app.post("/edit/:variable",function(req,res){
  user.findOneAndUpdate(
    {  username: req.params.variable  },
    {$set : {
      name: req.body.name||req.user.name,
      role : req.body.role||req.user.role,
      email : req.body.email||req.user.email,
      contact : req.body.contact||req.user.contact,
      username: req.body.username||req.user.username
    }
  },
    function(err){
      if(!err){
        res.redirect('/');
      }else{
        console.log(err);
      }
    }
  )
});

app.get("/bugpage/:id",function(req,res){
  if(req.isAuthenticated()){
  const title = req.params.id;

  bug.findOne({bugId: title}, function(err, foundBug){
    if(err){
      console.log(err);
    }else{
      console.log(foundBug);
      res.render("bugpage", {bug: foundBug, name: req.user.name,username: req.user.username,role: req.user.role})
    }
  })
}else{
  res.redirect("/");
}
})

app.post('/bugpage/:id', function(req, res) {
    console.log(req.body);
    var comments = {
        commentname: req.user.name,
        comment: req.body.comment
    }
    bug.update({bugId: req.params.id}, {$push: {comments: comments}}, {safe: true, upsert: true}, function(err, comments){

        if (err) {
            console.log("Issue with adding a comment");
            res.redirect('/bugpage/'+req.params.id);
        } else {
            console.log("Success Adding Comments");
            res.redirect('/bugpage/'+req.params.id);
        }
    });
});



//server
app.listen(8484,function(){
  console.log("Server statred on  port 8484");
});
