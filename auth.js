const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {loginValidation} = require("./validation");
const {query} = require("./sql");


router.get("/login", async (req,res) => {
    req.body.username = "nathan";
    req.body.password = "Test1234!!!!!!";
   const username = req.body.username;
   const password = req.body.password;

    console.log(`Authentication initiated.`);

    // Validate before we login user
    const { error } = loginValidation(req.body);
    if (error)
        return res.status(400).send({
            data: "",
            code: "103",
            message: `Malformed/unexpected syntax: ${error.details[0].message}`,
        });
    console.log(`User details have passed validation`)

    // Check if the user exists
    try{
        const userQuery = await query("SELECT username FROM users WHERE username = ?", [username]);
        if (!userQuery.length > 0)
            return res.status(422).send({
                data: "",
                code: "105",
                message:
                    "Account with the given username-password combination does not exist",
            });
    } catch (error) {
        console.error(`ERROR 11E | ${error}`);
        return res.status(500).send({
            data: "",
            code: "108",
            message: `We ran into an error, try again later. Error code: 11E`,
        });
    }
    console.log(`User exists in DB`)

    // Check if the password is correct
    try {
        const passwordQur = await query(
            "SELECT password FROM users WHERE username = ?",
            [username]
        );
        const dbPassword = passwordQur[0].password;
        const validPass = await bcrypt.compare(password, dbPassword);
        if (!validPass)
            return res.status(422).send({
                data: "",
                code: "104",
                message:
                    "Account with the given username-password combination does not exist",
            });
    } catch (error) {
        console.error(`ERROR 11F | ${error}`);
        return res.status(500).send({
            data: "",
            code: "108",
            message: `We ran into an error, try again later. Error code: 11F`,
        });
    }

    console.log(`User username/password combination in DB is correct`)

    // Check if the user is verified
    try {
        const isVerified = await query(
            "SELECT isVerified FROM users WHERE username = ?",
            [username]
        );
        if (!isVerified[0].isVerified)
            return res
                .status(422)
                .send({ data: "", code: "109", message: "User is not verified" });
    } catch (error) {
        console.error(`ERROR 11G | ${error}`);
        return res.status(500).send({
            data: "",
            code: "108",
            message: `We ran into an error, try again later. Error code: 11G`,
        });
    }
    console.log(`User is verified`)

    // User is logged in, provide them with a token
    try {
        const userIDQuery = await query(
            "SELECT userID, email FROM users WHERE username = ?",
            [username]
        );
        userID = userIDQuery[0].userID;
        email = userIDQuery[0].email;
    } catch (error) {
        console.error(`ERROR 11H | ${error}`);
        return res.status(500).send({
            data: "",
            code: "108",
            message: `We ran into an error, try again later. Error code: 11H`,
        });
    }
    console.log(`signing token with: ${userID}, ${username}, ${email}`);

    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_LIFE,
    });

    console.log(`Created token for user, sending email and result back to user. This should be the last log.`)


});

module.exports = router;