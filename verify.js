const { knex } = require("./sql");
const {
  NotAuthorisedResponse,
  InternalServerErrorResponse,
} = require("./customResponses");

// Verification if the requesting user is valid with admin privileges
async function verifyDelivery(req, res, next) {
  try {
    const tokenResponse = await checkDeliveryToken(req, res);
    if (tokenResponse.code !== 200)
      return res.status(tokenResponse.code).json(tokenResponse);
    next();
  } catch (e) {
    console.error("Error verifying delivery: ", e);
    return InternalServerErrorResponse(
      res,
      "Unable to verify delivery. Please try again",
    );
  }
}

// Verification if the requesting user is valid with admin privileges
async function verifyAdmin(req, res, next) {
  try {
    const tokenResponse = await checkToken(req, res);
    if (tokenResponse.code !== 200)
      return res.status(tokenResponse.code).json(tokenResponse);
    if (!(await isUserAdmin(req)))
      return NotAuthorisedResponse(
        res,
        "You do not have the right permissions to access this. Contact your admin.",
      );
    next();
  } catch (e) {
    console.error("Error verifying user: ", e);
    return InternalServerErrorResponse(
      res,
      "Unable to verify user. Please try again",
    );
  }
}

// Verification if the requesting user is valid with health and safety privileges
async function verifyHealth(req, res, next) {
  try {
    const tokenResponse = await checkToken(req, res);
    if (tokenResponse.code !== 200)
      return res.status(tokenResponse.code).json(tokenResponse);
    if (!(await isUserHealth(req)))
      return NotAuthorisedResponse(
        res,
        "You do not have the right permissions to access this. Contact your admin.",
      );
    next();
  } catch (e) {
    console.error("Error verifying user: ", e);
    return InternalServerErrorResponse(
      res,
      "Unable to verify user. Please try again",
    );
  }
}

// General verification if the requesting user is valid without access permission checks.
async function verify(req, res, next) {
  try {
    const tokenResponse = await checkToken(req, res);
    if (tokenResponse.code !== 200)
      return res.status(tokenResponse.code).json(tokenResponse);
    next();
  } catch (e) {
    console.error("Error verifying user: ", e);
    return InternalServerErrorResponse(
      res,
      "Unable to verify user. Please try again",
    );
  }
}

module.exports = { verify, verifyAdmin, verifyHealth, verifyDelivery };

const checkDeliveryToken = async (req, res) => {
  const accessPIN = req.body.accessPIN;

  if (!accessPIN) {
    return {
      code: 401,
      message: "'accessPIN' parameter is missing from request body",
      data: null,
    };
  }

  try {
    const isDelivery = await knex("deliveries")
      .select("*")
      .where("accessCode", accessPIN);

    if (isDelivery.length <= 0) {
      return { code: 401, message: "accessCode is invalid.", data: null };
    }
    req.body.delivery = isDelivery[0];

    return { code: 200, message: "Token is valid", data: isDelivery[0] };
  } catch (error) {
    console.error(error);
    console.log("Could not get delivery session: ", error);
    return { code: 500, message: "Could not get delivery session", data: null };
  }
};

const checkToken = async (req, res) => {
  const accessPIN = req.body.accessPIN;

  if (!accessPIN) {
    return {
      code: 401,
      message: "'accessPIN' parameter is missing from request body",
      data: null,
    };
  }

  try {
    const sessions = await knex("sessions")
      .select("*")
      .where("accessPIN", accessPIN);

    if (sessions.length <= 0) {
      return { code: 401, message: "accessPIN is invalid.", data: null };
    }

    const sessionExpiresAt = new Date(sessions[0].expiresAt);
    const now = new Date();

    if (sessionExpiresAt < now) {
      return {
        code: 401,
        message:
          "You cannot use yesterday's session as it has expired. Please Clock In again",
        data: null,
      };
    }

    const users = await knex("users")
      .select("*")
      .whereIn(
        "uid",
        knex("sessions").select("uid").where("accessPIN", accessPIN),
      );

    if (users.length > 0) {
      req.body.user = users[0];
    }

    return { code: 200, message: "Token is valid", data: null };
  } catch (error) {
    console.error(error);
    console.log("Could not get session: ", error);
    return { code: 500, message: "Could not get session", data: null };
  }
};

const isUserAdmin = async (req) => {
  if (req.body.user.access !== "admin") return false;
  return true;
};
const isUserHealth = async (req) => {
  if (req.body.user.access !== "health") return false;
  return true;
};
