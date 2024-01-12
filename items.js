const router = require("express").Router();
const {verify} = require("./verify");

router.post("/insert", verify, (req,res) => {

});

router.post("/remove", verify, (req,res) => {

})


module.exports = router;