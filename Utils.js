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

const generateUniqueAccessPIN = async () => {
    let uniqueAccessPIN;
    const maxAttempts = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const randomAccessPIN = Math.floor(1000 + Math.random() * 9000);
        const sql = "SELECT COUNT(*) as count FROM ADA.sessions WHERE accessPIN = ?";
        const params = [randomAccessPIN];

        try {
            const result = await query(sql, params);
            if (result[0].count === 0) {
                uniqueAccessPIN = randomAccessPIN;
                break;
            }
        } catch (error) {
            throw error;
        }
    }
    if (!uniqueAccessPIN) {
        throw new Error("Unable to generate a unique user ID after maximum attempts.");
    }
    return uniqueAccessPIN;
};

const getUserAccessFromInt = (accessValue) => {
    switch (accessValue){
        case 0:
            return "Normal";
        case 1:
            return "Admin";
        case 2:
            return "Health And Safety";
    }
}

const getNextDayMidnightTimestamp = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
}


module.exports = {generateUniqueUserID, generateUniqueAccessPIN, getNextDayMidnightTimestamp, getUserAccessFromInt}