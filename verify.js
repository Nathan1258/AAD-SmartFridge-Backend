const {query} = require("./sql");
const {NotAuthorisedResponse, InternalServerErrorResponse} = require("./customResponses");

// Verification if the requesting user is valid with admin privileges
async function verifyAdmin (req, res, next) {
    try{
        const tokenResponse = await checkToken(req, res);
        if(tokenResponse.code != 200) return res.status(tokenResponse.code).json(tokenResponse);
        if(!await isUserAdmin(req)) return NotAuthorisedResponse(res, "You do not have the right permissions to access this. Contact your admin.");
        next()
    }catch(e){
        console.error("Error verifying user: ", e);
        return InternalServerErrorResponse(res, "Unable to verify user. Please try again");
    }
}

// Verification if the requesting user is valid with health and safety privileges
async function verifyHealth (req,res,next) {
     try{
        const tokenResponse = await checkToken(req, res);
        if(tokenResponse.code != 200) return res.status(tokenResponse.code).json(tokenResponse);
        if(!await isUserHealth(req)) return NotAuthorisedResponse(res, "You do not have the right permissions to access this. Contact your admin.");
        next()
    }catch(e){
        console.error("Error verifying user: ", e);
        return InternalServerErrorResponse(res, "Unable to verify user. Please try again");
    }
}

// General verification if the requesting user is valid without access permission checks.
async function verify(req,res,next) {
    try{
        const tokenResponse = await checkToken(req, res);
        if(tokenResponse.code != 200) return res.status(tokenResponse.code).json(tokenResponse);
        next()
    }catch(e){
        console.error("Error verifying user: ", e);
        return InternalServerErrorResponse(res, "Unable to verify user. Please try again");
    }
}

module.exports = {verify, verifyAdmin, verifyHealth};


const checkToken = async (req, res) => {
    // Logic to test if provided details are valid
    const accessPIN = req.body.accessPIN;

    // accessPIN is not in the request body, send error message back to client
    if(!accessPIN) return {"code": 401, "message": "'accessPIN' parameter is missing from request body", "data": null};

    const queryString = "SELECT * FROM ADA.sessions WHERE accessPIN = ?";
    const params = [accessPIN];
    const result = await query(queryString, params);
    if(result <= 0) return {"code": 401, "message": "accessPIN is invalid.", data: null};

    const sessionExpiresAt = new Date(result[0].expiresAt);
    const now = new Date();

    if (sessionExpiresAt < now) return { "code": 401, "message": "You cannot use yesterday's session as it has expired. Please Clock In again", "data": null };

    const queryStringUser = "SELECT * FROM ADA.users WHERE uid = (SELECT uid FROM sessions WHERE accessPIN = ?)";
    const paramsUser = [req.body.accessPIN];
    const user = await query(queryStringUser, paramsUser);
    req.body.user = user[0];
    return { "code": 200, "message": "Token is valid", "data": null };
};

const isUserAdmin = async(req) => {
    if(req.body.user.access !== "admin") return false;
    return true;
}
const isUserHealth = async(req) => {
    if(req.body.user.access !== "health") return false;
    return true;
}