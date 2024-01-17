const router = require("express").Router();
const {verifyAdmin, verifyHealth} = require("./verify");
const {MalformedBodyResponse, InternalServerErrorResponse, OKResponse} = require("./customResponses");
const {addToActivityLog} = require("./Utils");


router.post("/log-action", verifyAdmin, async (req,res) => {
    let uid = req.body.uid;
    const action = req.body.action;

    if(!uid) uid = req.body.user.uid;
    if(!action) return MalformedBodyResponse(res, "'action' parameter is missing from request body");
    const response = await addToActivityLog(req, action);
    if(!response) return InternalServerErrorResponse(res, "Unable to log activity. Please try again later");
    return OKResponse(res, "Logged action successfully", {"uid": uid, "Action logged": action});
});

router.get("/generate", verifyHealth, (req,res) => {
    return res.send("Return generated report");
});


module.exports = router;