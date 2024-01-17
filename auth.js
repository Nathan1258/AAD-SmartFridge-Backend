const router = require("express").Router();
const {verify, verifyAdmin} = require("./verify");
const {generateUniqueUserID, generateUniqueAccessPIN, getNextDayMidnightTimestamp} = require("./Utils");
const {query} = require("./sql");


router.post("/register", async (req,res) => {
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const access = req.body.access;
    const password = req.body.password;

    try{
        const userID = await generateUniqueUserID();
        return res.status(200).json({"userID": userID});
    }catch(e){
        console.error("Error at /register: ", e);
    }
});

router.post("/clock-in", async (req,res) => {
    const uid = req.body.uid;
    const password = req.body.password;

    if(!uid) return res.status(400).json({code: 400, message: "'uid' parameter is missing from request body", data: null})
    if(!password) return res.status(400).json({code: 400, message: "'password' parameter is missing from request body", data: null})

    const queryString = "SELECT * FROM users WHERE uid = ?";
    const parameters = [uid];
    try {
        const result = await query(queryString, parameters);
        const passwordDB = result[0].password;
        // Need to hash password
        if(password !== passwordDB) return res.status(401).json({code: 401, message: "Password is invalid", data: null});
        const response = await createSession(uid);
        return res.status(response.code).json(response);
    } catch (error) {
        console.error("Error creating session:", error);
        return res.status(500).json({ code: 500, message: "Could not clock user in. Try again later.", data: null});
    }
});

router.put("/change-user-access", verifyAdmin, (req,res) => {
    const accessCode = req.body.accessCode;
    const newUserAccess = req.body.accessValue;
    const validAccessValues = [0,1,2]

    if(!newUserAccess) return res.status(400).json({code: 400, message: "'accessValue' parameter is missing from request body", data: null})
    if(!validAccessValues.includes(newUserAccess)) return res.status(400).json({code: 400, message: "Invalid 'accessValue' parameter. Valid values are: 0 (normal user), 1 (admin), 2 (health officer)", data: null})




    return res.send("testing permissions");
});

async function createSession(uid) {
     try {
        const accessPIN = await generateUniqueAccessPIN();
        const expiresAt = getNextDayMidnightTimestamp();

        const queryString = "INSERT INTO ADA.sessions (uid, accessPIN, expiresAt) VALUES (?, ?, ?)";
        const params = [uid, accessPIN, expiresAt];
        const result = await query(queryString, params);

        if (result.affectedRows && result.affectedRows > 0) {
            return { code: 200, message: "User clocked in successfully.", data: {"accessPIN": accessPIN}};
        } else {
            return { code: 500, message: "Could not clock user in. Try again later.", data: null};
        }
    } catch (error) {
        console.error("Error creating session:", error);
        return { code: 500, message: "Could not clock user in. Try again later.", data: null};
    }
}

module.exports = router;