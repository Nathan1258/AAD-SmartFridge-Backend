
// Verification if the requesting user is valid with admin privileges
const {query} = require("./sql");

async function verifyAdmin (req, res, next) {
    // Logic to test if provided details are valid
    const uid = req.body.uid;

    // uid is not in the request body, send error message back to client
    if(!uid) return res.json({"code": 401, "message": "'uid' parameter is missing from request body", "data": null});

    // Check if the user has correct permissions to perform action
    if(!isUserAdmin(uid)) return res.json({"code": 403, "message": "You do not have the required permissions to access this resource", "data": null});

    // Do more validation, call 'next()' if user is valid to continue processing request.
    if(true) next();
}

// Verification if the requesting user is valid with health and safety privileges
async function verifyHealth (req,res,next) {
    // Logic to test if provided details are valid
    const uid = req.body.uid;

    // uid is not in the request body, send error message back to client
    if(!uid) return res.json({"code": 401, "message": "'uid' parameter is missing from request body", "data": null});

    // Check if the user has correct permissions to perform action
    if(!isUserHealth(uid)) return res.json({"code": 403, "message": "You do not have the required permissions to access this resource", "data": null});

    // Do more validation, call 'next()' if user is valid to continue processing request.
    if(true) next();
}

// General verification if the requesting user is valid without access permission checks.
async function verify(req,res,next) {
    // Logic to test if provided details are valid
    const accessPIN = req.body.accessPIN;

    // accessPIN is not in the request body, send error message back to client
    if(!accessPIN) return res.json({"code": 401, "message": "'accessPIN' parameter is missing from request body", "data": null});

    const queryString = "SELECT * FROM ADA.sessions WHERE accessPIN = ?";
    const params = [accessPIN];
    try{
        const result = await query(queryString, params);
        if(result <= 0) return res.status(401).json({"code": 401, "message": "accessPIN is invalid.", data: null});

        const sessionExpiresAt = new Date(result[0].expiresAt);
        const now = new Date();

        if (sessionExpiresAt < now) return res.status(401).json({ "code": 401, "message": "You cannot use yesterday's session as it has expired. Please Clock In again", "data": null });
        next();

    }catch(e){
        console.error("Error verifying user: ", e);
        return res.status(500).json({"code": 500, "message": "Unable to verify user. Please try again", data: null});
    }
}

module.exports = {verify, verifyAdmin, verifyHealth};


function isUserAdmin(uid){
    // Check if given user is an admin via their uid
    return false;
}
function isUserHealth(uid){
    // Check if given user is an health and safety user via their uid
    return false;
}