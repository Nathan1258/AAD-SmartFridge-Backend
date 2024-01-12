const express = require("express");
const app = express();
app.use(express.json());

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