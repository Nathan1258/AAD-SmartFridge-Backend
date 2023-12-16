const express = require("express");
const app = express();

const authRoute = require("./auth");
app.use(express.json());


// Router middlewares
app.use("/auth", authRoute);


app.get("/test", (req,res) => {
   res.send("yay");
});


app.listen(5005, () =>{
   console.log("Server listening");
});