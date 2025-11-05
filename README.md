# 🎓 AttendanceMS - Professional Attendance Management System

[![CI/CD Pipeline](https://github.com/your-org/attendancems/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/your-org/attendancems/actions)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=attendancems&metric=security_rating)](https://sonarcloud.io/dashboard?id=attendancems)
[![Coverage](https://codecov.io/gh/your-org/attendancems/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/attendancems)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A world-class, enterprise-grade attendance management system built with modern web technologies. Designed for educational institutions seeking a comprehensive, secure, and scalable solution for attendance tracking and analytics.

## ✨ Key Features

### 🔐 **Enterprise Security**
- **Multi-layer Security**: Helmet.js, CORS, CSRF protection, XSS prevention
- **Advanced Authentication**: Secure session management with bcrypt encryption
- **Rate Limiting**: Intelligent API rate limiting and DDoS protection
- **Input Validation**: Comprehensive server-side validation with Joi schemas
- **Audit Logging**: Complete audit trail for all system activities

### ⚡ **High Performance**
- **Multi-tier Caching**: API, Database, Static content, and Report caching
- **Database Optimization**: Connection pooling, query optimization, indexing
- **Compression**: Gzip compression for faster response times
- **CDN Ready**: Optimized for content delivery networks
- **Memory Management**: Intelligent memory usage and garbage collection

### 📊 **Advanced Analytics**
- **Real-time Dashboards**: Live attendance monitoring and insights
- **Comprehensive Reports**: Daily, weekly, monthly, and custom reports
- **Performance Analytics**: Student and teacher performance tracking
- **Trend Analysis**: Attendance patterns and predictive insights
- **Export Capabilities**: PDF, CSV, Excel export functionality

### 📧 **Professional Communication**
- **Email Templates**: Beautiful, responsive HTML email templates
- **Automated Notifications**: Attendance alerts, weekly reports, low attendance warnings
- **Bulk Communications**: Mass email capabilities with rate limiting
- **SMS Integration**: Optional SMS notifications via Twilio
- **Customizable Alerts**: Configurable notification rules and schedules

### 🔄 **Backup & Recovery**
- **Automated Backups**: Scheduled full and incremental backups
- **Compression**: Efficient backup compression to save storage
- **Point-in-time Recovery**: Restore to any previous backup point
- **Backup Verification**: Automatic backup integrity checks
- **Cloud Storage**: Support for cloud backup storage

### 🚀 **DevOps & Deployment**
- **Docker Support**: Complete containerization with Docker Compose
- **CI/CD Pipeline**: Automated testing, building, and deployment
- **Health Monitoring**: Comprehensive health checks and monitoring
- **Load Balancing**: Nginx reverse proxy with load balancing
- **Auto-scaling**: Kubernetes-ready for horizontal scaling

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│  AttendanceMS   │────│   SQLite DB     │
│  Load Balancer  │    │   Application   │    │   with WAL      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │  Redis Cache    │              │
         │              │   & Sessions    │              │
         │              └─────────────────┘              │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Static Assets  │    │  Email Service  │    │ Backup Service  │
│   & Uploads     │    │   (SMTP/SES)    │    │  & Monitoring   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 **Quick Start**

### Prerequisites
- Node.js 16+ and npm 8+
- Docker and Docker Compose (for containerized deployment)
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/attendancems.git
cd attendancems

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run migrate

# Seed with sample data (optional)
npm run seed

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Deployment

```bash
# Using Docker Compose (Recommended)
docker-compose -f docker-compose.production.yml up -d

# Or manual deployment
npm run build
npm start
```

## 📋 **Configuration**

### Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-super-secret-key

# Database
DB_PATH=./data/app.db
DB_POOL_MAX=10

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="AttendanceMS <no-reply@attendancems.com>"

# Security
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_MAX=1000
API_KEYS=key1,key2,key3

# Features
BACKUP_ENABLED=true
CACHE_ENABLED=true
EMAIL_NOTIFICATIONS=true
```

### Docker Configuration

The system includes production-ready Docker configurations:

- **Multi-stage builds** for optimized image size
- **Health checks** for container monitoring
- **Volume management** for data persistence
- **Network isolation** for security
- **Resource limits** for performance

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Test coverage
npm run test:coverage

# Performance testing
npm run performance
```

## 📊 **Monitoring & Analytics**

### Health Endpoints
- `GET /health` - System health check
- `GET /metrics` - Performance metrics
- `GET /api/status` - API status and statistics

### Built-in Analytics
- Real-time attendance tracking
- Student performance analytics
- Teacher efficiency metrics
- Attendance trend analysis
- Custom report generation

## 🔧 **API Documentation**

Interactive API documentation is available at `/api-docs` when the server is running.

### Key Endpoints

```bash
# Authentication
POST /login              # User login
POST /register           # User registration
POST /logout             # User logout

# Classes Management
GET    /api/classes      # List classes
POST   /api/classes      # Create class
PUT    /api/classes/:id  # Update class
DELETE /api/classes/:id  # Delete class

# Student Management
GET    /class/:id/students           # List students
POST   /class/:id/students/save      # Add/update student
DELETE /class/:id/students/:studentId # Remove student

# Attendance
POST /class/:id/daily-attendance     # Mark attendance
GET  /class/:id/attendance-report    # Get attendance report
GET  /api/attendance/analytics       # Attendance analytics

# Reports
POST /reports/generate               # Generate custom reports
GET  /reports/export/:format         # Export reports
```

## 🛡️ **Security Features**

- **HTTPS Enforcement** with HSTS headers
- **Content Security Policy** (CSP) implementation
- **SQL Injection Protection** with parameterized queries
- **XSS Prevention** with input sanitization
- **CSRF Protection** with token validation
- **Rate Limiting** on all endpoints
- **Session Security** with secure cookies
- **Input Validation** with comprehensive schemas

## 📈 **Performance Optimizations**

- **Database Connection Pooling**
- **Query Result Caching**
- **Static Asset Compression**
- **CDN-ready Architecture**
- **Lazy Loading** for large datasets
- **Pagination** for all list endpoints
- **Background Job Processing**

## 🔄 **Backup & Recovery**

### Automated Backups
- **Daily full backups** at 2 AM
- **Incremental backups** every 6 hours
- **Compression** to reduce storage usage
- **Retention policy** (30 backups by default)

### Manual Backup Operations
```bash
# Create backup
npm run backup

# Restore from backup
npm run restore -- --file=backup_filename.db.gz

# List available backups
node scripts/list-backups.js
```

## 🚀 **Deployment Options**

### Cloud Platforms
- **Vercel** - Serverless deployment
- **Railway** - Container deployment
- **Render** - Full-stack deployment
- **DigitalOcean** - VPS deployment
- **AWS/GCP/Azure** - Enterprise deployment

### Container Orchestration
- **Docker Swarm** - Simple orchestration
- **Kubernetes** - Enterprise orchestration
- **Docker Compose** - Development/staging

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Documentation**: [docs.attendancems.com](https://docs.attendancems.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/attendancems/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/attendancems/discussions)
- **Email**: support@attendancems.com

## 🎯 **Roadmap**

### Version 2.1 (Q1 2024)
- [ ] Mobile application (React Native)
- [ ] Advanced reporting with charts
- [ ] Multi-language support
- [ ] LDAP/Active Directory integration

### Version 2.2 (Q2 2024)
- [ ] Machine learning attendance predictions
- [ ] Biometric integration
- [ ] Advanced role-based permissions
- [ ] API rate limiting per user

### Version 3.0 (Q3 2024)
- [ ] Microservices architecture
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Integration marketplace

---

**Built with ❤️ by the AttendanceMS Team**

*Making attendance management simple, secure, and scalable for educational institutions worldwide.*