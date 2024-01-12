const {query} = require("./sql");

// Generates a unique userID
const generateUniqueUserID = async () => {
    let uniqueUserID;
    const maxAttempts = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const randomUserID = Math.floor(1000 + Math.random() * 9000);
        const sql = "SELECT COUNT(*) as count FROM users WHERE userID = ?";
        const params = [randomUserID];

        try {
            const result = await query(sql, params);
            if (result[0].count === 0) {
                uniqueUserID = randomUserID;
                break;
            }
        } catch (error) {
            throw error;
        }
    }
    if (!uniqueUserID) {
        throw new Error("Unable to generate a unique user ID after maximum attempts.");
    }
    return uniqueUserID;
};

module.exports = {generateUniqueUserID}