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

const employeeSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
      },
    name: {
        type: String,
        required: [true, "Please fill the details"]
    },
    email:{
        type: String,
        required: [true],
        unique: true
      },
    password: String,
    contact:
    {
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
     enum: ['developer', 'tester', 'admin']
    },
    project: String,
    projectId: String,
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
        enum: ["to do", "in progress", "in review", "fixed"]
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
    }
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
  email:{
      type: String,
      required: [true],
      unique: true
    },
  contact:
  {
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
   enum: ['developer', 'tester', 'admin'],
  },
})

const user1  = new user ({
    username: "Adm0001",
    name: "Gaurav Garg",
    email: "garggaurav460@gmail.com",
    contact: "9993041370",
    role: "admin",
    projects: "Bug Tracking",
    password: "password1"
});

user.find({},function(err, foundusers){
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
})

const request = mongoose.model("request",requestSchema);


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
    contact: req.body.contact_no,
    password: req.body.password
  });

  request1.save();
  res.send("Your signup request has been sent to the admin.Please check your mail for approval.");
  /*user.register({name: req.body.fname,email: req.body.email,contact:req.body.contact_no,
  role:req.body.role,username:req.body.username}, req.body.password, function(err,user) {
    if(err){
      console.log(err);
      res.redirect("/signup");
    }else{
      res.send("Your signup request has been sent to the admin. Please check your mail for approval.");
    }
  })*/
})

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
         //res.json({success: true, message: 'Your new password has been saved successfully'})
         u.save();
         res.redirect("/");
       }
     })
   }
 });
})

//Admin module
app.get("/adminhomepage",function(req,res) {
  if(req.isAuthenticated() ) {
    if(req.user.role === "admin"){
      console.log("running total bugs list for adminhomepage.");
      bug.find({},function(err, foundbugs){
        if(err){
          console.log(err);
        }
        else{
          console.log(req.user.name);
          res.render("adminhomepage",{listbugs:foundbugs,uname:req.user.name});
        }
     });
   }else{
     res.send("you are unauthorized to access this page")
   }
  }else{
    res.redirect("/");
  }
})



app.get("/bugslist",function(req,res){
  if(req.isAuthenticated() ) {
    if(req.user.role === "admin"){
      console.log("running total bugs list for admin.");
      bug.find({},function(err, foundbugs){
        if(err){
          console.log(err);
        }
        else{
          console.log(foundbugs);
          console.log(req.user.name);
          res.render("bugslist",{listbugs:foundbugs,uname:req.user.name});
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
  if(req.isAuthenticated() ) {
    if(req.user.role === "admin"){
        res.render("assign");
    }else{
      res.send("you are unauthorized to access this page")
    }
  }else{
    res.redirect("/");
  }
})

app.get("/userlist",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.role === "admin"){
    console.log("running bugs list of tester.");
    user.find({},function(err, foundusers){
      if(err){
        console.log(err);
      }
      else{
        console.log(foundusers);
        console.log(req.user.name);
        res.render("userlist",{userli:foundusers,uname:req.user.name});
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
   res.redirect('/usersrequests');
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
      console.log(password);
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
   res.redirect('/usersrequests');
})

app.get("/usersrequests",function(req,res){
  if(isAuthenticated()){
   if(req.user.role === "admin"){
    request.find({},function(err, foundrequests){
        //console.log(foundusers.length);
      //  res.render("usersrequests",{requestsList:foundrequests});
         res.render("usersrequests1",{requestsList:foundrequests});
   });
 }else{
   res.send("you are unauthorized to access this page")
 }
}else{
  res.redirect("/");
}
});


//Developer module
app.get("/developerhomepage",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.role==="developer"){
      res.render("developerhomepage");
    }else{
      res.send("you are trying to access unauthorized page.")
    }
  }else{
    res.redirect("/");
  }
})
//Tester module
app.get("/testerhomepage",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.role==="tester"){
      console.log("running bugs list of tester.");
      bug.find({},function(err, foundbugs){
        if(err){
          console.log(err);
        }
        else{
          console.log(foundbugs);
          console.log(req.user.name);
          res.render("testerhomepage",{bugslist:foundbugs,uname:req.user.name});
        }
     });
    }else{
      res.send("you are trying to access unauthorized page.")
    }
   }else{
    res.redirect("/");
  }
})

app.get("/reportbugtester",function(req,res){
  if(req.isAuthenticated()){
    if(req.user.role==="tester"){
      res.render("reportbugtester");
    }else{
      res.send("you are trying to access unauthorized page.")
    }
  }else{
    res.redirect("/");
  }
})

app.post("/reportbugtester",function(req,res){
  console.log(req.body);
  console.log(req.user.name);
  const op = req.user.name;
  const bug1 = new bug({
    bugId:req.body.bugId,
    projectId:req.body.projectId,
    category:req.body.category,
    severity:req.body.severity,
    status:"to do",
    reportedBy:op,
    description:req.body.comment,
    openedDate:req.body.openedDate,
    dueDate:req.body.dueDate
  })
  bug1.save();
  res.redirect("/testerhomepage");
})
app.post("/testerhomepage",function(req,res){

})
//errors
app.get("*",(req,res)=>{
  res.send("404 not found")
})
//server
app.listen(8484,function(){
  console.log("Server statred on  port 8484");
});
