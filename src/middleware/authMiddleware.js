const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — validates Bearer JWT and attaches full DB user to req.user.
 * Also rejects suspended accounts mid-session.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Always fetch from DB so we get the latest user state (suspended, role, etc.)
    const user = await User.findById(decodedToken.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User no longer exists' });
    }

    // Reject suspended accounts even if token is still valid
    if (user.isSuspended) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    // Middleware must attach: req.user = plain object with fresh role data
    req.user = {
      ...decodedToken,
      role: user.role,
      _id: user._id
    };

    return next();

  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
};

/**
 * adminOnly — must be used after protect middleware.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Admin access required' });
};

/**
 * authorize(...roles) — flexible role-based access, used after protect.
 * Example: authorize('owner', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Role '${req.user?.role || 'none'}' cannot access this route`
      });
    }
    return next();
  };
};

const restrictTo = authorize;

module.exports = { protect, adminOnly, authorize, restrictTo };
