const { knex } = require("./sql");

// Generates a unique userID
// const generateUniqueUserID = async () => {
//   let uniqueUserID;
//   const maxAttempts = 1000;
//
//   for (let attempt = 0; attempt < maxAttempts; attempt++) {
//     const randomUserID = Math.floor(1000 + Math.random() * 9000);
//     const sql = "SELECT COUNT(*) as count FROM users WHERE userID = ?";
//     const params = [randomUserID];
//
//     try {
//       const result = await query(sql, params);
//       if (result[0].count === 0) {
//         uniqueUserID = randomUserID;
//         break;
//       }
//     } catch (error) {
//       throw error;
//     }
//   }
//   if (!uniqueUserID) {
//     throw new Error(
//       "Unable to generate a unique user ID after maximum attempts.",
//     );
//   }
//   return uniqueUserID;
// };

const generateUniqueAccessPIN = async () => {
  let uniqueAccessPIN;
  const maxAttempts = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomAccessPIN = Math.floor(1000 + Math.random() * 9000);
    const count = await knex("sessions")
      .where("accessPIN", randomAccessPIN)
      .count("accessPIN as count")
      .first();

    if (count.count === 0) {
      uniqueAccessPIN = randomAccessPIN;
      break;
    }
  }

  if (!uniqueAccessPIN) {
    throw new Error(
      "Unable to generate a unique user ID after maximum attempts.",
    );
  }

  return uniqueAccessPIN;
};

const getUserAccessFromInt = (accessValue) => {
  switch (accessValue) {
    case 0:
      return "Normal";
    case 1:
      return "Admin";
    case 2:
      return "Health And Safety";
  }
};

const convertToTimestamp = (dateString) => {
  const [day, month, year] = dateString.split("-");
  const formattedDate = `20${year}-${month}-${day}`;
  const date = new Date(formattedDate);
  return date.toISOString().slice(0, 19).replace("T", " ");
};

const addToActivityLog = async (req, actionHappened) => {
  return knex("activity")
    .insert({ uid: req.body.user.uid, action: actionHappened })
    .then((rows) => {
      return rows.length > 0;
    })
    .catch((error) => {
      console.log("Error adding to activity: ", error);
      return false;
    });
};

const addToActivityLog = async (actionHappened) => {
  return knex("activity")
    .insert({ action: actionHappened })
    .then((rows) => {
      return rows.length > 0;
    })
    .catch((error) => {
      console.log("Error adding to activity: ", error);
      return false;
    });
};

const getNextDayMidnightTimestamp = () => {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
};

function getCurrentTimestamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // January is 0
  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  generateUniqueAccessPIN,
  getNextDayMidnightTimestamp,
  getUserAccessFromInt,
  addToActivityLog,
  convertToTimestamp,
  getCurrentTimestamp,
};
