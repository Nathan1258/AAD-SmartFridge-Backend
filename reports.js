const router = require("express").Router();
const {verify, verifyHealth} = require("./verify");

router.get("/generate", verifyHealth, (req,res) => {
    return res.send("Return generated report");
});


module.exports = router;