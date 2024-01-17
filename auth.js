const router = require("express").Router();
const {verify, verifyAdmin, verifyHealth} = require("./verify");
const {generateUniqueUserID, generateUniqueAccessPIN, getNextDayMidnightTimestamp, getUserAccessFromInt} = require("./Utils");
const {query} = require("./sql");
const {InternalServerErrorResponse, OKResponse, NotAuthorisedResponse, MalformedBodyResponse} = require("./customResponses");


router.post("/register", async (req,res) => {
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const access = req.body.access;
    const password = req.body.password;

    try{
        const userID = await generateUniqueUserID();
        return OKResponse(res, "User successfully created", {"userID": userID})
    }catch(e){
        console.error("Error at /register: ", e);
    }
});

router.post("/clock-in", async (req,res) => {
    const uid = req.body.uid;
    const password = req.body.password;

    if(!uid) return MalformedBodyResponse(res, "'uid' parameter is missing from request body");
    if(!password) return MalformedBodyResponse(res, "'password' parameter is missing from request body");

    const queryString = "SELECT * FROM users WHERE uid = ?";
    const parameters = [uid];
    try {
        const result = await query(queryString, parameters);
        const passwordDB = result[0].password;
        if(password !== passwordDB) return NotAuthorisedResponse(res, "Password is invalid");
        const response = await createSession(uid);
        return res.status(response.code).json(response);
    } catch (error) {
        console.error("Error creating session:", error);
        return InternalServerErrorResponse(res, "Could not clock user in. Try again later.");
    }
});

router.put("/change-user-access", verifyAdmin, async (req,res) => {
    const uid = req.body.uid;
    const newUserAccess = (req.body.newAccessValue).toLowerCase();
    const validAccessValues = ["normal","admin","health"]

    if(!uid) return MalformedBodyResponse(res, "'uid' parameter is missing from request body.")
    if(!newUserAccess) return MalformedBodyResponse(res, "'newAccessValue' parameter is missing from request body")
    if(!validAccessValues.includes(newUserAccess)) return MalformedBodyResponse(res, "Invalid 'accessValue' parameter. Valid values are: 'Normal' (normal user), 'Admin' (admin), 'Health' (health officer)");

    const queryString = "UPDATE ADA.users SET access = ? WHERE uid = ?";
    const params = [newUserAccess, uid];
    try{
        const result = await query(queryString, params);
        console.log(result);
        if(result <= 0) return InternalServerErrorResponse(res, "Unable to update user's access. Please try again.");
        return OKResponse(res, "User's access has been successfully updated", {"uid": uid, "New access": newUserAccess});
    }catch(e){
        console.error("Error updating user access: ", e);
        return InternalServerErrorResponse(res, "Unable to update user's access. Please try again.");
    }

});

async function createSession(uid) {
     try {
        const accessPIN = await generateUniqueAccessPIN();
        const expiresAt = getNextDayMidnightTimestamp();

        const queryString = "INSERT INTO ADA.sessions (uid, accessPIN, expiresAt) VALUES (?, ?, ?)";
        const params = [uid, accessPIN, expiresAt];
        const result = await query(queryString, params);

        if (result.affectedRows && result.affectedRows > 0) {
            return OKResponse(res, "User clocked in successfully.", {"accessPIN": accessPIN})
        } else {
            return InternalServerErrorResponse(res, "Could not clock user in. Try again later.");
        }
    } catch (error) {
        console.error("Error creating session:", error);
        return InternalServerErrorResponse(res, "Could not clock user in. Try again later.");
    }
}

module.exports = router;