import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.isConfigured = false;
    
    this.initializeTransporter();
    this.loadTemplates();
  }

  initializeTransporter() {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    if (config.auth.user && config.auth.pass) {
      this.transporter = nodemailer.createTransporter(config);
      this.isConfigured = true;
      logger.info('Email service configured successfully');
    } else {
      logger.warn('Email service not configured - missing SMTP credentials');
    }
  }

  loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates/email');
    
    // Create templates directory if it doesn't exist
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Load email templates
    const templateFiles = [
      'welcome.html',
      'verification.html',
      'attendance-alert.html',
      'weekly-report.html',
      'password-reset.html'
    ];

    templateFiles.forEach(file => {
      const filePath = path.join(templatesDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const templateName = file.replace('.html', '');
        this.templates.set(templateName, content);
      }
    });

    logger.info(`Loaded ${this.templates.size} email templates`);
  }

  getTemplate(templateName) {
    return this.templates.get(templateName) || this.getDefaultTemplate(templateName);
  }

  getDefaultTemplate(templateName) {
    const templates = {
      welcome: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1>Welcome to AttendanceMS!</h1>
            <p>Your account has been created successfully.</p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; margin-top: 20px; border-radius: 10px;">
            <h2>Hello {{name}},</h2>
            <p>Welcome to our professional attendance management system. You can now:</p>
            <ul>
              <li>Manage your classes and students</li>
              <li>Track attendance with advanced features</li>
              <li>Generate comprehensive reports</li>
              <li>Communicate with parents automatically</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{loginUrl}}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Your Account
              </a>
            </div>
          </div>
        </div>
      `,
      
      verification: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1>Verify Your Email</h1>
            <p>Please verify your email address to complete registration.</p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; margin-top: 20px; border-radius: 10px;">
            <h2>Hello {{name}},</h2>
            <p>Thank you for registering with AttendanceMS. Please click the button below to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verificationUrl}}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p><small>This link will expire in 24 hours. If you didn't create this account, please ignore this email.</small></p>
          </div>
        </div>
      `,
      
      'attendance-alert': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1>Attendance Alert</h1>
            <p>Your child was absent from class today.</p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; margin-top: 20px; border-radius: 10px;">
            <h2>Dear {{parentName}},</h2>
            <p>This is to inform you that <strong>{{studentName}}</strong> was marked absent in the following class:</p>
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Class:</strong> {{className}}</p>
              <p><strong>Date:</strong> {{date}}</p>
              <p><strong>Session:</strong> {{sessionTime}}</p>
              {{#if note}}<p><strong>Note:</strong> {{note}}</p>{{/if}}
            </div>
            <p>If this is unexpected, please contact the school immediately.</p>
          </div>
        </div>
      `,
      
      'weekly-report': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1>Weekly Attendance Report</h1>
            <p>{{startDate}} - {{endDate}}</p>
          </div>
          <div style="padding: 20px; background: #f8f9fa; margin-top: 20px; border-radius: 10px;">
            <h2>Dear {{parentName}},</h2>
            <p>Here's the weekly attendance summary for <strong>{{studentName}}</strong>:</p>
            
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #28a745;">{{presentDays}}</div>
                  <div style="color: #666;">Present</div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #dc3545;">{{absentDays}}</div>
                  <div style="color: #666;">Absent</div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #667eea;">{{attendanceRate}}%</div>
                  <div style="color: #666;">Attendance Rate</div>
                </div>
              </div>
            </div>
            
            {{#if lowAttendance}}
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>⚠️ Attention Required:</strong> Attendance is below the required minimum of {{minAttendance}}%.
            </div>
            {{/if}}
            
            <p>For any concerns, please contact the class teacher.</p>
          </div>
        </div>
      `
    };

    return templates[templateName] || '<p>{{message}}</p>';
  }

  replaceTemplateVariables(template, variables) {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    });

    // Handle conditional blocks
    result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    return result;
  }

  async sendEmail(to, subject, templateName, variables = {}) {
    if (!this.isConfigured) {
      logger.warn('Email not sent - service not configured', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const template = this.getTemplate(templateName);
      const html = this.replaceTemplateVariables(template, variables);

      const mailOptions = {
        from: process.env.SMTP_FROM || 'AttendanceMS <no-reply@attendancems.com>',
        to,
        subject,
        html,
        // Add text version
        text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Email sending failed', {
        to,
        subject,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Bulk email sending with rate limiting
  async sendBulkEmails(emails, delayMs = 1000) {
    const results = [];
    
    for (let i = 0; i < emails.length; i++) {
      const { to, subject, templateName, variables } = emails[i];
      
      try {
        const result = await this.sendEmail(to, subject, templateName, variables);
        results.push({ to, ...result });
        
        // Rate limiting delay
        if (i < emails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        results.push({
          to,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    logger.info('Bulk email sending completed', {
      total: results.length,
      successful,
      failed
    });

    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  // Send attendance alerts
  async sendAttendanceAlert(studentName, parentEmail, parentName, className, date, sessionTime, note = null) {
    return await this.sendEmail(
      parentEmail,
      `Attendance Alert - ${studentName}`,
      'attendance-alert',
      {
        parentName,
        studentName,
        className,
        date: new Date(date).toLocaleDateString(),
        sessionTime: sessionTime || 'All Day',
        note
      }
    );
  }

  // Send weekly report
  async sendWeeklyReport(studentName, parentEmail, parentName, attendanceData) {
    const { presentDays, absentDays, totalDays, attendanceRate, minAttendance } = attendanceData;
    
    return await this.sendEmail(
      parentEmail,
      `Weekly Attendance Report - ${studentName}`,
      'weekly-report',
      {
        parentName,
        studentName,
        presentDays,
        absentDays,
        totalDays,
        attendanceRate,
        minAttendance,
        lowAttendance: attendanceRate < minAttendance,
        startDate: attendanceData.startDate,
        endDate: attendanceData.endDate
      }
    );
  }

  // Send verification email
  async sendVerificationEmail(email, name, verificationUrl) {
    return await this.sendEmail(
      email,
      'Verify Your AttendanceMS Account',
      'verification',
      {
        name,
        verificationUrl
      }
    );
  }

  // Send welcome email
  async sendWelcomeEmail(email, name, loginUrl) {
    return await this.sendEmail(
      email,
      'Welcome to AttendanceMS',
      'welcome',
      {
        name,
        loginUrl
      }
    );
  }

  // Test email configuration
  async testConfiguration() {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get email statistics
  getStats() {
    return {
      configured: this.isConfigured,
      templatesLoaded: this.templates.size,
      availableTemplates: Array.from(this.templates.keys())
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;
export { EmailService };