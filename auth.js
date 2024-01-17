const router = require("express").Router();
const {verifyAdmin} = require("./verify");
const {generateUniqueUserID, generateUniqueAccessPIN, getNextDayMidnightTimestamp} = require("./Utils");
const {query} = require("./sql");
const {InternalServerErrorResponse, OKResponse, NotAuthorisedResponse, MalformedBodyResponse} = require("./customResponses");
const {encryptPassword, comparePassword} = require("./secure");


router.post("/register", async (req,res) => {
    const {first_name, last_name, access } = req.body;
    const encryptedPassword = await encryptPassword(req.body.password);

    try{
        let queryString;
        let params;
        if (!access) {
            queryString = "INSERT INTO ADA.users (first_name, last_name, password) values (?, ?, ?)";
            params = [first_name, last_name, encryptedPassword];
        } else {
            queryString = "INSERT INTO ADA.users (first_name, last_name, access, password) values (?, ?, ?, ?)";
            params = [first_name, last_name, access, encryptedPassword];
        }
        const result = await query(queryString, params);
        if(result.affectedRows <= 0) return InternalServerErrorResponse(res, "Unable to create user. Please try again.");
        return OKResponse(res, "User successfully created", {"first_name": first_name, "last_name": last_name});
    }catch(e){
        console.error("Error registering a user: ", e);
        return InternalServerErrorResponse(res, "Unable to create user. Please try again.");
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
        if(!await comparePassword(password, passwordDB)) return NotAuthorisedResponse(res, "Password is invalid");
        const response = await createSession(uid);
        if(response != null) return OKResponse(res, "User clocked in successfully", {"accessPIN": response});
        return InternalServerErrorResponse(res, "Unable to clock user in. Try again later.");
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
        if(result <= 0) return InternalServerErrorResponse(res, "Unable to update user's access. Please try again.");
        return OKResponse(res, "User's access has been successfully updated", {"uid": uid, "New access": newUserAccess});
    }catch(e){
        console.error("Error updating user access: ", e);
        return InternalServerErrorResponse(res, "Unable to update user's access. Please try again.");
    }

});

async function createSession(uid) {
     try {
        await deleteSession(uid);
        const accessPIN = await generateUniqueAccessPIN();
        const expiresAt = getNextDayMidnightTimestamp();

        const queryString = "INSERT INTO ADA.sessions (uid, accessPIN, expiresAt) VALUES (?, ?, ?)";
        const params = [uid, accessPIN, expiresAt];
        const result = await query(queryString, params);

        if (result.affectedRows && result.affectedRows > 0) {
            return accessPIN;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error creating session:", error);
        return null;
    }
}

async function deleteSession(uid) {
     try {

        const queryString = "DELETE FROM ADA.sessions WHERE uid = ?";
        const params = [uid];
        await query(queryString, params);
    } catch (error) {
        console.error("Error creating session:", error);
        return false;
    }
}

module.exports = router;