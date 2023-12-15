const Joi = require("@hapi/joi");
const { any } = require("@hapi/joi");

// Register validation
const registerValidation = (data) => {
    const schema = Joi.object({
        username: Joi.string().max(255).required(),
        email: Joi.string().max(255).required().email(),
        password: Joi.string().min(10).max(1024).required(),
    });

    return schema.validate(data);
};

// Login validation
const loginValidation = (data) => {
    const schema = Joi.object({
        username: Joi.string().max(255).required(),
        password: Joi.string().min(10).max(1024).required(),
        redirectURL: Joi.string(),
    });

    return schema.validate(data);
};

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;