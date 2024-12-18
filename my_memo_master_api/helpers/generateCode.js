module.exports = () => {
    // Generate a random 6-digit code, meant to be used for email verification, password reset, etc
    const code = Math.floor(100000 + Math.random() * 900000);
    return code;
}