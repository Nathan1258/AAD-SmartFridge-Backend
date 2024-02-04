const router = require("express").Router();
const { verifyAdmin, verifyHealth } = require("./verify");
const {
  MalformedBodyResponse,
  InternalServerErrorResponse,
  OKResponse,
} = require("./customResponses");
const { knex } = require("./sql");
const { addToActivityLog } = require("./Utils");

router.post("/log-action", verifyAdmin, async (req, res) => {
  let uid = req.body.uid;
  const action = req.body.action;

  if (!uid) uid = req.body.user.uid;
  if (!action)
    return MalformedBodyResponse(
      res,
      "'action' parameter is missing from request body",
    );
  const response = await addToActivityLog(req, action);
  if (!response)
    return InternalServerErrorResponse(
      res,
      "Unable to log activity. Please try again later",
    );
  return OKResponse(res, "Logged action successfully", {
    uid: uid,
    "Action logged": action,
  });
});

router.post("/fetch/logs", verifyAdmin, async (req, res) => {
  const { dateStart, dateEnd } = req.body;

  try {
    let query = knex("activity").orderBy("occuredAt", "desc");

    if (dateStart && dateEnd) {
      query = query.whereBetween("occuredAt", [
        new Date(dateStart * 1000).toISOString(),
        new Date(dateEnd * 1000).toISOString(),
      ]);
    }

    const logs = await query;

    if (logs.length === 0) {
      return OKResponse(res, "No activity logs found");
    }

    return OKResponse(res, "Activity logs fetched successfully", logs);
  } catch (error) {
    console.error("Error fetching activity logs: ", error);
    return InternalServerErrorResponse(
      res,
      "Error fetching activity logs. Please try again later.",
    );
  }
});

module.exports = router;
