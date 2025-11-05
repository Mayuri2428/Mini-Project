import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AttendanceMS API',
      version: '2.0.0',
      description: 'Professional Attendance Management System API',
      contact: {
        name: 'AttendanceMS Support',
        email: 'mjsfutane21@gmail.com',
        url: 'https://github.com/Mayuri2428/Mini-Project'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://attendancems.vercel.app',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for external integrations'
        }
      },
      schemas: {
        Teacher: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Teacher full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Teacher email address'
            },
            phone: {
              type: 'string',
              pattern: '^[\\+]?[1-9][\\d]{0,15}$',
              description: 'Phone number'
            },
            department: {
              type: 'string',
              description: 'Department name'
            },
            designation: {
              type: 'string',
              description: 'Job designation'
            },
            profile_photo: {
              type: 'string',
              description: 'Profile photo URL'
            },
            bio: {
              type: 'string',
              description: 'Teacher biography'
            },
            email_verified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Class: {
          type: 'object',
          required: ['name', 'teacher_id'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier'
            },
            name: {
              type: 'string',
              description: 'Class name'
            },
            section: {
              type: 'string',
              description: 'Class section'
            },
            teacher_id: {
              type: 'integer',
              description: 'Teacher ID'
            },
            department: {
              type: 'string',
              description: 'Department name'
            },
            semester: {
              type: 'string',
              description: 'Semester/Year'
            },
            academic_year: {
              type: 'string',
              description: 'Academic year (e.g., 2024-25)'
            },
            subject: {
              type: 'string',
              description: 'Subject name'
            },
            description: {
              type: 'string',
              description: 'Class description'
            },
            student_count: {
              type: 'integer',
              description: 'Number of enrolled students'
            }
          }
        },
        Student: {
          type: 'object',
          required: ['name', 'class_id'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Student full name'
            },
            roll_no: {
              type: 'string',
              description: 'Roll number'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Student email'
            },
            phone: {
              type: 'string',
              description: 'Phone number'
            },
            class_id: {
              type: 'integer',
              description: 'Class ID'
            },
            enrollment_status: {
              type: 'string',
              enum: ['active', 'inactive', 'graduated', 'transferred'],
              description: 'Enrollment status'
            },
            academic_year: {
              type: 'string',
              description: 'Academic year'
            },
            branch: {
              type: 'string',
              description: 'Branch/Department'
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth'
            },
            address: {
              type: 'string',
              description: 'Home address'
            },
            emergency_contact: {
              type: 'string',
              description: 'Emergency contact name'
            },
            emergency_phone: {
              type: 'string',
              description: 'Emergency contact phone'
            },
            notes: {
              type: 'string',
              description: 'Additional notes'
            }
          }
        },
        Attendance: {
          type: 'object',
          required: ['date', 'class_id', 'student_id', 'status'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Attendance date'
            },
            session_time: {
              type: 'string',
              pattern: '^\\d{2}:\\d{2}-\\d{2}:\\d{2}$',
              description: 'Session time (e.g., 09:00-10:00)'
            },
            class_id: {
              type: 'integer',
              description: 'Class ID'
            },
            student_id: {
              type: 'integer',
              description: 'Student ID'
            },
            status: {
              type: 'string',
              enum: ['present', 'absent', 'late', 'excused'],
              description: 'Attendance status'
            },
            note: {
              type: 'string',
              description: 'Additional notes'
            },
            marked_at: {
              type: 'string',
              format: 'date-time',
              description: 'When attendance was marked'
            },
            marked_by: {
              type: 'integer',
              description: 'Teacher who marked attendance'
            }
          }
        },
        AttendanceReport: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['daily_summary', 'student_wise', 'session_wise', 'attendance_trends'],
              description: 'Report type'
            },
            data: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Report data'
            },
            summary: {
              type: 'object',
              description: 'Report summary statistics'
            },
            metadata: {
              type: 'object',
              properties: {
                class: {
                  $ref: '#/components/schemas/Class'
                },
                dateRange: {
                  type: 'object',
                  properties: {
                    from: {
                      type: 'string',
                      format: 'date'
                    },
                    to: {
                      type: 'string',
                      format: 'date'
                    }
                  }
                },
                generatedAt: {
                  type: 'string',
                  format: 'date-time'
                },
                generatedBy: {
                  type: 'string'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        sessionAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/middleware/*.js'
  ]
};

// Generate swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Custom CSS for swagger UI
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info { margin: 20px 0; }
  .swagger-ui .info .title { color: #667eea; }
  .swagger-ui .scheme-container { background: #f8f9fa; padding: 20px; border-radius: 8px; }
`;

// Swagger UI options
const swaggerUiOptions = {
  customCss,
  customSiteTitle: 'AttendanceMS API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

// API documentation middleware
export const setupApiDocs = (app) => {
  // Serve swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // API status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      name: 'AttendanceMS API',
      version: '2.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      documentation: '/api-docs',
      endpoints: {
        authentication: '/api/auth',
        classes: '/api/classes',
        students: '/api/students',
        attendance: '/api/attendance',
        reports: '/api/reports'
      }
    });
  });
};

// API response helpers
export const apiResponse = {
  success: (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  },

  error: (res, message, statusCode = 500, details = null) => {
    res.status(statusCode).json({
      success: false,
      error: message,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    });
  },

  paginated: (res, data, pagination, message = 'Success') => {
    res.json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit)
      },
      timestamp: new Date().toISOString()
    });
  }
};

// API validation middleware
export const validateApiRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return apiResponse.error(res, 'Validation failed', 400, {
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    next();
  };
};

// API rate limiting info
export const rateLimitInfo = (req, res, next) => {
  res.set({
    'X-RateLimit-Limit': req.rateLimit?.limit || 'N/A',
    'X-RateLimit-Remaining': req.rateLimit?.remaining || 'N/A',
    'X-RateLimit-Reset': req.rateLimit?.reset || 'N/A'
  });
  next();
};

export { swaggerSpec };

export default {
  setupApiDocs,
  apiResponse,
  validateApiRequest,
  rateLimitInfo,
  swaggerSpec
};