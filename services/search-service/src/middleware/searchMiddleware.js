module.exports = (req, res, next) => {
  console.log(`[Search] ${req.method} ${req.url}`);
  next();
};
