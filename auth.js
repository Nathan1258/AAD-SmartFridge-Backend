const router = require("express").Router();
const {verify, verifyAdmin} = require("./verify");
const {generateUniqueUserID} = require("./Utils");


router.post("/register", async (req,res) => {
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const access = req.body.access;

    try{
        const userID = await generateUniqueUserID();
        return res.status(200).json({"userID": userID});
    }catch(e){
        console.error("Error at /register: ", e);
    }

});

router.put("/change-user-access", verifyAdmin, (req,res) => {
    return res.send("testing permissions");
});

module.exports = router;