const router = require("express").Router();
const {verify, verifyAdmin} = require("./verify");

router.get("/test", verify, (req,res) => {
    return res.send("testing route");
});


router.put("/change-user-access", verifyAdmin, (req,res) => {
    return res.send("testing permissions");
});

module.exports = router;