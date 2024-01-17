const router = require("express").Router();
const {verify} = require("./verify");

router.post("/replenish", verify, (req,res) => {
    return res.send("yay");
});

router.post("/login", verify, (req,res) => {

});

router.get("/confirm", verify, (req,res) => {

});


module.exports = router;