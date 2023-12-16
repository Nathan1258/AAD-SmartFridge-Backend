const express = require("express");
const app = express();

app.use(express.json());

app.get("/test", (req,res) => {
   res.send("yay");
});


app.listen(5021, () =>{
   console.log("Server listening");
});