
// Verification if the requesting user is valid with admin privileges
async function verifyAdmin (req,res,next) {
    // Logic to test if provided details are valid
    const uid = req.body.uid;

    // uid is not in the request body, send error message back to client
    if(!uid) return res.json({"code": 401, "message": "'uid' is missing from request body", "data": null});

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
    if(!uid) return res.json({"code": 401, "message": "'uid' is missing from request body", "data": null});

    // Check if the user has correct permissions to perform action
    if(!isUserHealth(uid)) return res.json({"code": 403, "message": "You do not have the required permissions to access this resource", "data": null});

    // Do more validation, call 'next()' if user is valid to continue processing request.
    if(true) next();
}

// General verification if the requesting user is valid without access permission checks.
async function verify(req,res,next) {
//     Logic to test if provided details are valid
    const uid = req.body.uid;

    // uid is not in the request body, send error message back to client
    if(!uid) return res.json({"code": 401, "message": "'uid' is missing from request body", "data": null});

    // Do more validation, call 'next()' if user is valid to continue processing request.
    if(true) next();
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