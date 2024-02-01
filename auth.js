const router = require("express").Router();
const { verify, verifyAdmin } = require("./verify");
const {
  generateUniqueAccessPIN,
  getNextDayMidnightTimestamp,
} = require("./Utils");
const { knex } = require("./sql");
const {
  InternalServerErrorResponse,
  OKResponse,
  NotAuthorisedResponse,
  MalformedBodyResponse,
} = require("./customResponses");
const { encryptPassword, comparePassword } = require("./secure");

router.post("/register", async (req, res) => {
  const { first_name, last_name, access, password } = req.body;
  const encryptedPassword = await encryptPassword(password);
  const allowedAccess = ["normal", "admin", "health"];

  if (!first_name)
    return MalformedBodyResponse(
      res,
      "'first_name' parameter is missing from request body",
    );
  if (!last_name)
    return MalformedBodyResponse(
      res,
      "'last_name' parameter is missing from request body",
    );
  if (!access)
    return MalformedBodyResponse(
      res,
      "'access' parameter is missing from request body",
    );

  let insertData = {
    first_name: first_name,
    last_name: last_name,
    password: encryptedPassword,
  };

  if (access && allowedAccess.includes(access.toLowerCase())) {
    insertData.access = access.toLowerCase();
  }
  return knex("users")
    .insert(insertData)
    .then((result) => {
      const uid = result[0];
      if (!uid) {
        return InternalServerErrorResponse(
          res,
          "Unable to create user. Please try again.",
        );
      }
      // Proceed to use uid as necessary
      return OKResponse(res, "User successfully created", {
        uid: uid,
        first_name: insertData.first_name,
        last_name: insertData.last_name,
      });
    })
    .catch((error) => {
      console.error("Error registering a user: ", error);
      return InternalServerErrorResponse(
        res,
        "Unable to create user. Please try again.",
      );
    });
});

router.post("/details", verify, (req, res) => {
  const { password, ...userWithoutPassword } = req.body.user;
  return OKResponse(res, "User details provided", userWithoutPassword);
});

router.post("/clock-in", async (req, res) => {
  const { uid, password } = req.body;

  if (!uid)
    return MalformedBodyResponse(
      res,
      "'uid' parameter is missing from request body",
    );
  if (!password)
    return MalformedBodyResponse(
      res,
      "'password' parameter is missing from request body",
    );

  return knex("users")
    .select("*")
    .where("uid", uid)
    .then(async (rows) => {
      if (rows <= 0) {
        return NotAuthorisedResponse(res, "Invalid user number and password");
      }
      const passwordDB = rows[0].password;

      if (!(await comparePassword(password, passwordDB)))
        return NotAuthorisedResponse(res, "Password is invalid");

      const response = await createSession(uid);

      if (response != null) {
        return OKResponse(res, "User clocked in successfully", {
          accessPIN: response,
        });
      } else {
        return InternalServerErrorResponse(
          res,
          "User session could not be created, try again later",
        );
      }

      return InternalServerErrorResponse(
        res,
        "Unable to clock user in. Try again later.",
      );
    })
    .catch((error) => {
      console.error("Error creating session:", error);
      return InternalServerErrorResponse(
        res,
        "Could not clock user in. Try again later.",
      );
    });
});

router.post("/verifyAccessToken", verify, (req, res) => {
  return OKResponse(res, "Access Token valid", true);
});

router.post("/change-user-access", verifyAdmin, async (req, res) => {
  const { uid, newAccessValue } = req.body;
  const validAccessValues = ["normal", "admin", "health"];

  if (!uid)
    return MalformedBodyResponse(
      res,
      "'uid' parameter is missing from request body.",
    );
  if (!newAccessValue)
    return MalformedBodyResponse(
      res,
      "'newAccessValue' parameter is missing from request body",
    );
  if (!validAccessValues.includes(newAccessValue))
    return MalformedBodyResponse(
      res,
      "Invalid 'accessValue' parameter. Valid values are: 'Normal' (normal user), 'Admin' (admin), 'Health' (health officer)",
    );

  return knex("users")
    .where("uid", uid)
    .update({
      access: newAccessValue,
    })
    .then((rows) => {
      if (rows <= 0) {
        return InternalServerErrorResponse(
          res,
          "Unable to update user's access. Please try again.",
        );
      }
      return OKResponse(res, "User's access has been successfully updated", {
        uid: uid,
        "New access": newAccessValue,
      });
    })
    .catch((error) => {
      console.error("Error updating user access: ", error);
      return InternalServerErrorResponse(
        res,
        "Unable to update user's access. Please try again.",
      );
    });
});

router.post("/getAllUsers", verifyAdmin, async (req, res) => {
  return knex("users")
    .select("*")
    .then((rows) => {
      return OKResponse(res, "Returned all users", rows);
    })
    .catch((error) => {
      console.error("Error getting all users", error);
      return InternalServerErrorResponse(
        res,
        "Could not fetch users. Try again later.",
      );
    });
});

async function createSession(uid) {
  await deleteSession(uid);
  const accessPIN = await generateUniqueAccessPIN();
  const expiresAt = getNextDayMidnightTimestamp();

  return knex("sessions")
    .insert({
      uid: uid,
      accessPIN: accessPIN,
      expiresAt: expiresAt,
    })
    .then((rows) => {
      console.log(rows);
      if (rows >= 1) {
        return accessPIN;
      }
      return null;
    })
    .catch((error) => {
      console.error("Error creating session:", error);
      return null;
    });
}

async function deleteSession(uid) {
  return knex("sessions")
    .where("uid", uid)
    .del()
    .catch((error) => {
      console.error("Error deleting session:", error);
      return false;
    });
}

module.exports = router;
