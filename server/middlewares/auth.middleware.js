function requireAdmin(req, res, next) {
  const role = req.cookies?.role;
  if (role === 'admin') {
    next();
  } else {
    res.redirect('/');
  }
}
module.exports = { requireAdmin };