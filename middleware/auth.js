import jwt from 'jsonwebtoken';
import pgDb from '../data/postgres.js';

// Helper: Authenticate user by Bearer token (JWT)
export function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = pgDb.users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Session invalid or user deleted' });
    }
    
    if (user.account_state === 'suspended') {
      return res.status(403).json({ error: 'Forbidden: Account suspended.' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
}

// Helper: Authorize roles guard
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]` });
    }
    next();
  };
}

// Helper: Sanitize user object before returning to client
export function sanitizeUser(user) {
  if (!user) return user;
  const sanitized = { ...user };
  delete sanitized.passwordHash;
  return sanitized;
}
