import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';

// Rate limiting configurations
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Specific rate limiters
export const authLimiter = createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts');
export const apiLimiter = createRateLimiter(15 * 60 * 1000, 1000, 'API rate limit exceeded');
export const uploadLimiter = createRateLimiter(60 * 60 * 1000, 10, 'Too many file uploads');

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://attendancems.vercel.app',
      'https://attendancems.railway.app',
      'https://attendancems.onrender.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Compression middleware
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
});

// Input validation schemas
export const validationSchemas = {
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  
  register: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
    body('department').optional().trim().isLength({ max: 100 }),
    body('designation').optional().trim().isLength({ max: 100 })
  ],
  
  attendance: [
    body('class_id').isInt({ min: 1 }).withMessage('Valid class ID required'),
    body('session_time').matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/).withMessage('Valid session time format required'),
    body('attendance').isObject().withMessage('Attendance data required')
  ],
  
  student: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Student name required'),
    body('roll_no').optional().trim().isLength({ max: 20 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Valid phone number required'),
    body('enrollment_status').optional().isIn(['active', 'inactive', 'graduated', 'transferred'])
  ]
};

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// CSRF protection
export const csrfProtection = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
};

// Generate CSRF token
export const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

// SQL injection protection
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/['"\\;]/g, '');
};

// XSS protection
export const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// File upload security
export const secureFileUpload = {
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  }
};

// Session security
export const sessionSecurity = {
  name: 'sessionId',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 6 * 60 * 60 * 1000, // 6 hours
    sameSite: 'strict'
  }
};

// API key validation
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.API_KEYS?.split(',') || [];
  
  if (req.path.startsWith('/api/') && !validApiKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Audit logging
export const auditLogger = (action, userId, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip: details.ip,
    userAgent: details.userAgent,
    details: JSON.stringify(details)
  };
  
  // Log to database or external service
  console.log('AUDIT:', logEntry);
  
  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to external logging service
  }
};

export default {
  createRateLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  securityHeaders,
  corsOptions,
  compressionMiddleware,
  validationSchemas,
  handleValidationErrors,
  csrfProtection,
  generateCSRFToken,
  sanitizeInput,
  escapeHtml,
  secureFileUpload,
  sessionSecurity,
  validateApiKey,
  auditLogger
};