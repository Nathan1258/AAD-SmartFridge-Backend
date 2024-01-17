const {query} = require("./sql");

// Verification if the requesting user is valid with admin privileges
async function verifyAdmin (req, res, next) {
    try{
        const tokenResponse = await checkToken(req);
        if(!tokenResponse) return res.status(401).json({ "code": 401, "message": "You cannot use yesterday's session as it has expired. Please Clock In again", "data": null });
        if(!isUserAdmin(req)) return res.status(401).json({ "code": 401, "message": "You do not have the right permissions to access this. Contact your admin.", "data": null });
        next()
    }catch(e){
        console.error("Error verifying user: ", e);
        return res.status(500).json({"code": 500, "message": "Unable to verify user. Please try again", data: null});
    }
}

// Verification if the requesting user is valid with health and safety privileges
async function verifyHealth (req,res,next) {
     try{
        const tokenResponse = await checkToken(req);
        if(!tokenResponse) return res.status(401).json({ "code": 401, "message": "You cannot use yesterday's session as it has expired. Please Clock In again", "data": null });
        if(!isUserHealth(req)) return res.status(401).json({ "code": 401, "message": "You do not have the right permissions to access this. Contact your admin.", "data": null });
        next()
    }catch(e){
        console.error("Error verifying user: ", e);
        return res.status(500).json({"code": 500, "message": "Unable to verify user. Please try again", data: null});
    }
}

// General verification if the requesting user is valid without access permission checks.
async function verify(req,res,next) {
    try{
        const tokenResponse = await checkToken(req);
        if(!tokenResponse) return res.status(401).json({ "code": 401, "message": "You cannot use yesterday's session as it has expired. Please Clock In again", "data": null });
        next()
    }catch(e){
        console.error("Error verifying user: ", e);
        return res.status(500).json({"code": 500, "message": "Unable to verify user. Please try again", data: null});
    }
}

module.exports = {verify, verifyAdmin, verifyHealth};


const checkToken = async (req) => {
    // Logic to test if provided details are valid
    const accessPIN = req.body.accessPIN;

    // accessPIN is not in the request body, send error message back to client
    if(!accessPIN) return res.json({"code": 401, "message": "'accessPIN' parameter is missing from request body", "data": null});

    const queryString = "SELECT * FROM ADA.sessions WHERE accessPIN = ?";
    const params = [accessPIN];
    const result = await query(queryString, params);
    if(result <= 0) return res.status(401).json({"code": 401, "message": "accessPIN is invalid.", data: null});

    const sessionExpiresAt = new Date(result[0].expiresAt);
    const now = new Date();

    if (sessionExpiresAt < now) return false;
    return true;
};

function isUserAdmin(req){
    // Check if given user is an admin via their uid
    return false;
}
function isUserHealth(req){
    // Check if given user is an health and safety user via their uid
    return false;
}