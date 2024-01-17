const bcrypt = require('bcrypt');
const saltRounds = 10;

const encryptPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(password, salt);
  } catch (err) {
    console.error(err);
  }
};

const comparePassword = async (submittedPassword, storedHash) => {
  try {
    return await bcrypt.compare(submittedPassword, storedHash);
  } catch (err) {
    console.error(err);
    return false;
  }
};

module.exports = {encryptPassword, comparePassword}