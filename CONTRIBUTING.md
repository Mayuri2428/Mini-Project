# 🤝 Contributing to AttendanceMS

Thank you for your interest in contributing to AttendanceMS! This document provides guidelines and information for contributors.

## 🎯 **Ways to Contribute**

- 🐛 **Bug Reports**: Help us identify and fix issues
- ✨ **Feature Requests**: Suggest new functionality
- 💻 **Code Contributions**: Submit bug fixes and new features
- 📚 **Documentation**: Improve guides and documentation
- 🎨 **Design**: Enhance UI/UX and visual design
- 🧪 **Testing**: Add tests and improve coverage

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 16+ and npm 8+
- Git
- Basic knowledge of JavaScript, Express.js, and SQLite

### **Development Setup**
```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/attendancems.git
cd attendancems

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run migrate
npm run seed  # Optional: add sample data

# Start development server
npm run dev
```

## 📋 **Development Guidelines**

### **Code Style**
- Use ESLint and Prettier configurations provided
- Follow existing code patterns and conventions
- Write meaningful commit messages using conventional commits
- Add comments for complex logic

### **Testing**
- Write tests for new features and bug fixes
- Ensure all tests pass before submitting PR
- Maintain or improve test coverage
- Test both happy path and edge cases

### **Documentation**
- Update README.md for significant changes
- Add JSDoc comments for functions and classes
- Update API documentation for endpoint changes
- Include examples in documentation

## 🔄 **Contribution Workflow**

### **1. Create an Issue**
Before starting work, create an issue to discuss:
- Bug reports with reproduction steps
- Feature requests with detailed descriptions
- Questions about implementation

### **2. Fork and Branch**
```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/attendancems.git

# Create a feature branch
git checkout -b feature/amazing-feature
# or
git checkout -b fix/bug-description
```

### **3. Make Changes**
- Write clean, readable code
- Follow existing patterns and conventions
- Add tests for new functionality
- Update documentation as needed

### **4. Test Your Changes**
```bash
# Run linting
npm run lint

# Run tests
npm test

# Check test coverage
npm run test:coverage

# Test manually
npm run dev
```

### **5. Commit Changes**
Use conventional commit format:
```bash
git commit -m "feat: add user profile management"
git commit -m "fix: resolve attendance calculation bug"
git commit -m "docs: update API documentation"
```

### **6. Submit Pull Request**
- Push your branch to your fork
- Create a pull request with detailed description
- Link related issues
- Wait for review and address feedback

## 🎨 **Code Standards**

### **JavaScript Style**
```javascript
// Use modern ES6+ features
const getData = async () => {
  try {
    const result = await fetchData();
    return result;
  } catch (error) {
    logger.error('Failed to fetch data', { error: error.message });
    throw error;
  }
};

// Use meaningful variable names
const attendanceRecords = await getAttendanceByClass(classId);

// Add JSDoc comments
/**
 * Calculate attendance percentage for a student
 * @param {number} studentId - Student ID
 * @param {string} dateRange - Date range for calculation
 * @returns {Promise<number>} Attendance percentage
 */
async function calculateAttendancePercentage(studentId, dateRange) {
  // Implementation
}
```

### **Database Queries**
```javascript
// Use parameterized queries
const students = await db.all(
  'SELECT * FROM students WHERE class_id = ? AND status = ?',
  [classId, 'active']
);

// Handle errors properly
try {
  await db.run('INSERT INTO attendance ...', params);
} catch (error) {
  logger.error('Failed to insert attendance', { error: error.message });
  throw new Error('Attendance insertion failed');
}
```

### **API Endpoints**
```javascript
// Use proper HTTP status codes
app.post('/api/students', async (req, res) => {
  try {
    const student = await createStudent(req.body);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Validate input
const { error, value } = studentSchema.validate(req.body);
if (error) {
  return res.status(400).json({ success: false, error: error.details[0].message });
}
```

## 🧪 **Testing Guidelines**

### **Unit Tests**
```javascript
describe('AttendanceService', () => {
  describe('calculatePercentage', () => {
    it('should calculate correct percentage', async () => {
      const result = await attendanceService.calculatePercentage(1, '2024-01-01:2024-01-31');
      expect(result).to.be.a('number');
      expect(result).to.be.within(0, 100);
    });
  });
});
```

### **Integration Tests**
```javascript
describe('POST /api/attendance', () => {
  it('should create attendance record', async () => {
    const response = await request(app)
      .post('/api/attendance')
      .send(validAttendanceData)
      .expect(201);
    
    expect(response.body).to.have.property('success', true);
  });
});
```

## 📚 **Documentation Standards**

### **README Updates**
- Keep installation instructions current
- Update feature lists for new functionality
- Add screenshots for UI changes
- Update deployment instructions if needed

### **API Documentation**
- Use OpenAPI/Swagger format
- Include request/response examples
- Document error responses
- Add authentication requirements

### **Code Comments**
```javascript
/**
 * Marks attendance for multiple students in a class
 * 
 * @param {number} classId - The class identifier
 * @param {Object} attendanceData - Attendance data object
 * @param {string} attendanceData.date - Date in YYYY-MM-DD format
 * @param {Object} attendanceData.students - Student attendance mapping
 * @param {number} teacherId - Teacher marking attendance
 * @returns {Promise<Object>} Result object with success status
 * 
 * @example
 * const result = await markBulkAttendance(1, {
 *   date: '2024-01-15',
 *   students: { 1: 'present', 2: 'absent' }
 * }, 1);
 */
```

## 🐛 **Bug Reports**

When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment information (OS, Node.js version, browser)
- Screenshots or error logs if applicable

## ✨ **Feature Requests**

For feature requests, provide:
- Clear description of the feature
- Use cases and motivation
- Proposed implementation approach
- UI mockups if applicable
- Consider backward compatibility

## 🔒 **Security**

- Never commit sensitive information (passwords, API keys)
- Use environment variables for configuration
- Follow security best practices
- Report security vulnerabilities privately

## 📞 **Getting Help**

- 💬 **Discord**: Join our community server
- 📧 **Email**: Contact maintainers directly
- 📋 **Issues**: Create GitHub issues for bugs/features
- 📖 **Documentation**: Check existing guides and docs

## 🏆 **Recognition**

Contributors are recognized through:
- GitHub contributor graphs
- Release notes mentions
- Hall of fame in documentation
- Special badges and swag
- Conference speaking opportunities

## 📄 **License**

By contributing to AttendanceMS, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to AttendanceMS! Together, we're building the future of educational technology.** 🎓✨