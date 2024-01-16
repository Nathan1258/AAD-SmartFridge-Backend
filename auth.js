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
    const newUserAccess = req.body.accessValue;
    const validAccessValues = [0,1,2]

    if(!newUserAccess) return res.status(400).json({code: 400, message: "'accessValue' parameter is missing from request body", data: null})
    if(!validAccessValues.includes(newUserAccess)) return res.status(400).json({code: 400, message: "Invalid 'accessValue' parameter. Valid values are: 0 (normal user), 1 (admin), 2 (health officer)", data: null})




    return res.send("testing permissions");
});

module.exports = router;