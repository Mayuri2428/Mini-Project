#!/usr/bin/env node

/**
 * AttendanceMS Health Check Script
 * Comprehensive system health verification
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  baseUrl: process.env.HEALTH_CHECK_URL || 'http://localhost:3000',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 10000,
  retries: parseInt(process.env.HEALTH_CHECK_RETRIES) || 3,
  retryDelay: parseInt(process.env.HEALTH_CHECK_RETRY_DELAY) || 2000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class HealthChecker {
  constructor() {
    this.results = {
      overall: 'unknown',
      checks: {},
      timestamp: new Date().toISOString(),
      duration: 0
    };
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        timeout: config.timeout,
        headers: {
          'User-Agent': 'AttendanceMS-HealthCheck/1.0',
          ...options.headers
        }
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: Date.now() - requestStart
          });
        });
      });

      const requestStart = Date.now();
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.data) {
        req.write(options.data);
      }
      
      req.end();
    });
  }

  async checkWithRetry(checkName, checkFunction) {
    let lastError;
    
    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        const result = await checkFunction();
        this.results.checks[checkName] = {
          status: 'pass',
          message: result.message || 'Check passed',
          data: result.data,
          attempt: attempt,
          responseTime: result.responseTime
        };
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < config.retries) {
          this.log(`  Attempt ${attempt} failed, retrying in ${config.retryDelay}ms...`, 'yellow');
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }
    }
    
    this.results.checks[checkName] = {
      status: 'fail',
      message: lastError.message,
      attempts: config.retries,
      error: lastError.name
    };
    return false;
  }

  async checkApplicationHealth() {
    this.log('🔍 Checking application health endpoint...', 'blue');
    
    return this.checkWithRetry('application_health', async () => {
      const response = await this.makeRequest(`${config.baseUrl}/health`);
      
      if (response.statusCode !== 200) {
        throw new Error(`Health endpoint returned ${response.statusCode}`);
      }
      
      let healthData;
      try {
        healthData = JSON.parse(response.data);
      } catch (e) {
        throw new Error('Health endpoint returned invalid JSON');
      }
      
      if (healthData.status !== 'OK') {
        throw new Error(`Health status is ${healthData.status}`);
      }
      
      return {
        message: 'Application health check passed',
        data: healthData,
        responseTime: response.responseTime
      };
    });
  }

  async checkDatabaseConnection() {
    this.log('🗄️  Checking database connection...', 'blue');
    
    return this.checkWithRetry('database_connection', async () => {
      const response = await this.makeRequest(`${config.baseUrl}/api/status`);
      
      if (response.statusCode !== 200) {
        throw new Error(`Status endpoint returned ${response.statusCode}`);
      }
      
      let statusData;
      try {
        statusData = JSON.parse(response.data);
      } catch (e) {
        throw new Error('Status endpoint returned invalid JSON');
      }
      
      if (!statusData.database || statusData.database.status !== 'connected') {
        throw new Error('Database is not connected');
      }
      
      return {
        message: 'Database connection is healthy',
        data: statusData.database,
        responseTime: response.responseTime
      };
    });
  }

  async checkApiEndpoints() {
    this.log('🔌 Checking critical API endpoints...', 'blue');
    
    const endpoints = [
      { path: '/api/classes', name: 'classes_api' },
      { path: '/api/attendance/summary', name: 'attendance_api' },
      { path: '/api-docs.json', name: 'api_documentation' }
    ];
    
    let allPassed = true;
    
    for (const endpoint of endpoints) {
      const passed = await this.checkWithRetry(endpoint.name, async () => {
        const response = await this.makeRequest(`${config.baseUrl}${endpoint.path}`);
        
        if (response.statusCode >= 400) {
          throw new Error(`${endpoint.path} returned ${response.statusCode}`);
        }
        
        return {
          message: `${endpoint.path} is accessible`,
          responseTime: response.responseTime
        };
      });
      
      if (!passed) allPassed = false;
    }
    
    return allPassed;
  }

  async checkFileSystem() {
    this.log('📁 Checking file system...', 'blue');
    
    return this.checkWithRetry('file_system', async () => {
      const requiredDirs = ['data', 'logs', 'uploads', 'backups'];
      const projectRoot = path.join(__dirname, '..');
      
      for (const dir of requiredDirs) {
        const dirPath = path.join(projectRoot, dir);
        if (!fs.existsSync(dirPath)) {
          throw new Error(`Required directory missing: ${dir}`);
        }
        
        // Check if directory is writable
        try {
          const testFile = path.join(dirPath, '.health-check-test');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
        } catch (e) {
          throw new Error(`Directory not writable: ${dir}`);
        }
      }
      
      return {
        message: 'All required directories exist and are writable',
        data: { directories: requiredDirs }
      };
    });
  }

  async checkMemoryUsage() {
    this.log('💾 Checking memory usage...', 'blue');
    
    return this.checkWithRetry('memory_usage', async () => {
      const response = await this.makeRequest(`${config.baseUrl}/health`);
      
      if (response.statusCode !== 200) {
        throw new Error(`Health endpoint returned ${response.statusCode}`);
      }
      
      let healthData;
      try {
        healthData = JSON.parse(response.data);
      } catch (e) {
        throw new Error('Health endpoint returned invalid JSON');
      }
      
      const memoryUsage = healthData.memory;
      if (!memoryUsage) {
        throw new Error('Memory usage data not available');
      }
      
      // Check if memory usage is reasonable (less than 90% of heap limit)
      const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (usagePercent > 90) {
        throw new Error(`High memory usage: ${usagePercent.toFixed(1)}%`);
      }
      
      return {
        message: `Memory usage is healthy: ${usagePercent.toFixed(1)}%`,
        data: memoryUsage
      };
    });
  }

  async checkSecurityHeaders() {
    this.log('🔒 Checking security headers...', 'blue');
    
    return this.checkWithRetry('security_headers', async () => {
      const response = await this.makeRequest(`${config.baseUrl}/`);
      
      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection'
      ];
      
      const missingHeaders = requiredHeaders.filter(
        header => !response.headers[header]
      );
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
      }
      
      return {
        message: 'All required security headers are present',
        data: { headers: requiredHeaders }
      };
    });
  }

  async runAllChecks() {
    this.log('🚀 Starting AttendanceMS Health Check...', 'cyan');
    this.log(`Target: ${config.baseUrl}`, 'blue');
    this.log('', 'reset');
    
    const checks = [
      { name: 'Application Health', fn: () => this.checkApplicationHealth() },
      { name: 'Database Connection', fn: () => this.checkDatabaseConnection() },
      { name: 'API Endpoints', fn: () => this.checkApiEndpoints() },
      { name: 'File System', fn: () => this.checkFileSystem() },
      { name: 'Memory Usage', fn: () => this.checkMemoryUsage() },
      { name: 'Security Headers', fn: () => this.checkSecurityHeaders() }
    ];
    
    let passedChecks = 0;
    
    for (const check of checks) {
      try {
        const passed = await check.fn();
        if (passed) {
          this.log(`✅ ${check.name}: PASSED`, 'green');
          passedChecks++;
        } else {
          this.log(`❌ ${check.name}: FAILED`, 'red');
        }
      } catch (error) {
        this.log(`❌ ${check.name}: ERROR - ${error.message}`, 'red');
      }
    }
    
    this.results.duration = Date.now() - this.startTime;
    this.results.overall = passedChecks === checks.length ? 'healthy' : 'unhealthy';
    
    this.log('', 'reset');
    this.log('📊 Health Check Summary:', 'cyan');
    this.log(`Overall Status: ${this.results.overall.toUpperCase()}`, 
             this.results.overall === 'healthy' ? 'green' : 'red');
    this.log(`Checks Passed: ${passedChecks}/${checks.length}`, 'blue');
    this.log(`Duration: ${this.results.duration}ms`, 'blue');
    
    // Output detailed results if requested
    if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
      this.log('', 'reset');
      this.log('📋 Detailed Results:', 'cyan');
      console.log(JSON.stringify(this.results, null, 2));
    }
    
    // Exit with appropriate code
    process.exit(this.results.overall === 'healthy' ? 0 : 1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
AttendanceMS Health Check Script

Usage: node health-check.js [options]

Options:
  --help, -h      Show this help message
  --verbose, -v   Show detailed results
  --url <url>     Override base URL (default: http://localhost:3000)
  --timeout <ms>  Request timeout in milliseconds (default: 10000)
  --retries <n>   Number of retries per check (default: 3)

Environment Variables:
  HEALTH_CHECK_URL           Base URL for health checks
  HEALTH_CHECK_TIMEOUT       Request timeout in milliseconds
  HEALTH_CHECK_RETRIES       Number of retries per check
  HEALTH_CHECK_RETRY_DELAY   Delay between retries in milliseconds

Exit Codes:
  0  All health checks passed
  1  One or more health checks failed
`);
  process.exit(0);
}

// Override config from command line arguments
const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  config.baseUrl = process.argv[urlIndex + 1];
}

const timeoutIndex = process.argv.indexOf('--timeout');
if (timeoutIndex !== -1 && process.argv[timeoutIndex + 1]) {
  config.timeout = parseInt(process.argv[timeoutIndex + 1]);
}

const retriesIndex = process.argv.indexOf('--retries');
if (retriesIndex !== -1 && process.argv[retriesIndex + 1]) {
  config.retries = parseInt(process.argv[retriesIndex + 1]);
}

// Run health checks
const healthChecker = new HealthChecker();
healthChecker.runAllChecks().catch(error => {
  console.error('Health check failed with error:', error);
  process.exit(1);
});