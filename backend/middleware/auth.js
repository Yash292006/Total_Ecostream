module.exports = function (req, res, next) {
  // Direct Access: Automatically authenticate all incoming requests as a global guest user
  req.user = {
    id: '000000000000000000000000',
    username: 'guest'
  };
  next();
};
