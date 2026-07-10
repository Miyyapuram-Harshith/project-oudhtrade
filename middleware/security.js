import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xssClean from 'xss-clean';

// Rate Limiting configuration
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP to 150 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure Security Middleware
export function configureSecurity(app) {
  // 1. Set Security HTTP headers
  app.use(helmet());
  
  // 2. Data Sanitization against XSS
  app.use(xssClean());
  
  // 3. Global API Rate limiting
  app.use('/api/', apiLimiter);
}
