const express = require("express");
const app = express();
const dotenv = require('dotenv');
dotenv.config();
app.use(express.json());
app.use(function (req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
})

const authRoute = require('./auth');
const itemsRoute = require("./items");
const deliveryRoute = require("./delivery");
const reportsRoute = require("./reports");


app.use("/v1/users", authRoute);
app.use("/v1/items", itemsRoute);
app.use("/v1/delivery", deliveryRoute);
app.use("/v1/reports", reportsRoute);


app.get("/", (req,res) => {
   res.send("<h1>Advanced Analysis and Design API server</h1>");
});

app.listen(5021, () =>{
   console.log("Server listening");
});