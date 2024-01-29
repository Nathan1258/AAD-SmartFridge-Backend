const router = require("express").Router();
const { verify } = require("./verify");
const cron = require("node-cron");

// Scheduled stock analysis
cron.schedule("0 */12 * * *", () => {
  console.log("Scanning stock file for near expiring/low stock items...");
});

router.post("/replenish", verify, (req, res) => {});

router.post("/login", verify, (req, res) => {});

router.get("/confirm", verify, (req, res) => {});

module.exports = router;
