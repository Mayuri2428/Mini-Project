/**
 * Comprehensive Connectivity Test Suite
 * Tests all frontend-backend connections
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'mjsfutane21@gmail.com';
const TEST_PASSWORD = 'abc@1234';

let sessionCookie = '';
let testClassId = null;
let testStudentId = null;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(message, 'blue');
  log('='.repeat(60), 'blue');
}

// Helper function to make authenticated requests
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Save session cookie
    const setCookie = response.headers.get('set-cookie');
    if (setCookie && !sessionCookie) {
      sessionCookie = setCookie.split(';')[0];
    }

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    };
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  logSection('Test 1: Health Check');
  
  const response = await request('/health');
  
  if (response.ok) {
    logSuccess('Health check passed');
    logInfo(`Status: ${JSON.stringify(response.data)}`);
    return true;
  } else {
    logError('Health check failed');
    return false;
  }
}

// Test 2: Authentication
async function testAuthentication() {
  logSection('Test 2: Authentication');
  
  // Test login
  const loginResponse = await request('/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (loginResponse.ok || loginResponse.status === 302) {
    logSuccess('Login successful');
    return true;
  } else {
    logError('Login failed');
    logInfo(`Response: ${JSON.stringify(loginResponse.data)}`);
    return false;
  }
}

// Test 3: Dashboard APIs
async function testDashboardAPIs() {
  logSection('Test 3: Dashboard APIs');
  
  const tests = [
    { name: 'Teacher Totals', endpoint: '/api/teacher/totals' },
    { name: 'Today Summary', endpoint: '/api/teacher/today' },
    { name: 'Trend Data', endpoint: '/api/teacher/trend?days=7' },
    { name: 'Teacher Dashboard', endpoint: '/api/teacher-dashboard' },
    { name: 'Quick Stats', endpoint: '/api/quick-stats' },
  ];

  let passed = 0;
  
  for (const test of tests) {
    const response = await request(test.endpoint);
    
    if (response.ok) {
      logSuccess(`${test.name} API working`);
      passed++;
    } else {
      logError(`${test.name} API failed`);
      logInfo(`Status: ${response.status}`);
    }
  }

  logInfo(`Dashboard APIs: ${passed}/${tests.length} passed`);
  return passed === tests.length;
}

// Test 4: Class Management
async function testClassManagement() {
  logSection('Test 4: Class Management');
  
  // Get classes
  const classesResponse = await request('/api/teacher/totals');
  
  if (classesResponse.ok) {
    logSuccess('Retrieved classes');
    
    // Try to get a class ID for further tests
    const dashboardResponse = await request('/api/teacher-dashboard');
    if (dashboardResponse.ok && dashboardResponse.data.classes && dashboardResponse.data.classes.length > 0) {
      testClassId = dashboardResponse.data.classes[0].id;
      logInfo(`Using test class ID: ${testClassId}`);
      
      // Test class-specific APIs
      if (testClassId) {
        const classTests = [
          { name: 'Class Summary', endpoint: `/api/class/${testClassId}/summary` },
          { name: 'Class Trend', endpoint: `/api/class/${testClassId}/trend?days=7` },
          { name: 'Student Percentages', endpoint: `/api/class/${testClassId}/student-percentages` },
        ];

        let passed = 0;
        for (const test of classTests) {
          const response = await request(test.endpoint);
          if (response.ok) {
            logSuccess(`${test.name} API working`);
            passed++;
          } else {
            logError(`${test.name} API failed`);
          }
        }

        logInfo(`Class APIs: ${passed}/${classTests.length} passed`);
        return passed === classTests.length;
      }
    }
    
    return true;
  } else {
    logError('Failed to retrieve classes');
    return false;
  }
}

// Test 5: Analytics APIs
async function testAnalyticsAPIs() {
  logSection('Test 5: Analytics APIs');
  
  if (!testClassId) {
    logInfo('Skipping analytics tests (no test class available)');
    return true;
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const tests = [
    { 
      name: 'Attendance Heatmap', 
      endpoint: `/api/analytics/heatmap/${testClassId}?startDate=${weekAgo}&endDate=${today}` 
    },
    { 
      name: 'Trends Analysis', 
      endpoint: `/api/analytics/trends/${testClassId}?period=7` 
    },
    { 
      name: 'Comparative Analysis', 
      endpoint: '/api/analytics/comparative?period=7' 
    },
  ];

  let passed = 0;
  
  for (const test of tests) {
    const response = await request(test.endpoint);
    
    if (response.ok) {
      logSuccess(`${test.name} API working`);
      passed++;
    } else {
      logError(`${test.name} API failed`);
      logInfo(`Status: ${response.status}`);
    }
  }

  logInfo(`Analytics APIs: ${passed}/${tests.length} passed`);
  return passed === tests.length;
}

// Test 6: Real-time Features
async function testRealtimeFeatures() {
  logSection('Test 6: Real-time Features');
  
  if (!testClassId) {
    logInfo('Skipping real-time tests (no test class available)');
    return true;
  }

  const response = await request(`/api/realtime-attendance/${testClassId}`);
  
  if (response.ok) {
    logSuccess('Real-time attendance API working');
    logInfo(`Data structure: ${Object.keys(response.data).join(', ')}`);
    return true;
  } else {
    logError('Real-time attendance API failed');
    return false;
  }
}

// Test 7: Notification System
async function testNotificationSystem() {
  logSection('Test 7: Notification System');
  
  const tests = [
    { name: 'Get Notifications', endpoint: '/notifications', method: 'GET' },
    { name: 'Unread Count', endpoint: '/api/notifications/unread-count', method: 'GET' },
  ];

  let passed = 0;
  
  for (const test of tests) {
    const response = await request(test.endpoint, { method: test.method });
    
    // Accept both 200 and 302 (redirect) as success
    if (response.ok || response.status === 302) {
      logSuccess(`${test.name} API working`);
      passed++;
    } else {
      logError(`${test.name} API failed`);
      logInfo(`Status: ${response.status}`);
    }
  }

  logInfo(`Notification APIs: ${passed}/${tests.length} passed`);
  return passed === tests.length;
}

// Test 8: Static Assets
async function testStaticAssets() {
  logSection('Test 8: Static Assets');
  
  const assets = [
    '/js/api-client.js',
    '/js/loading-states.js',
    '/js/toast-notifications.js',
    '/js/alert-system.js',
  ];

  let passed = 0;
  
  for (const asset of assets) {
    const response = await request(asset);
    
    if (response.ok) {
      logSuccess(`${asset} accessible`);
      passed++;
    } else {
      logError(`${asset} not found`);
    }
  }

  logInfo(`Static Assets: ${passed}/${assets.length} accessible`);
  return passed === assets.length;
}

// Test 9: Database Connection
async function testDatabaseConnection() {
  logSection('Test 9: Database Connection');
  
  // Test by trying to get data that requires DB
  const response = await request('/api/teacher/totals');
  
  if (response.ok && response.data) {
    logSuccess('Database connection working');
    logInfo(`Data: ${JSON.stringify(response.data)}`);
    return true;
  } else {
    logError('Database connection failed');
    return false;
  }
}

// Test 10: Session Management
async function testSessionManagement() {
  logSection('Test 10: Session Management');
  
  if (sessionCookie) {
    logSuccess('Session cookie established');
    logInfo(`Cookie: ${sessionCookie.substring(0, 50)}...`);
    
    // Test authenticated endpoint
    const response = await request('/api/teacher/totals');
    
    if (response.ok) {
      logSuccess('Session authentication working');
      return true;
    } else {
      logError('Session authentication failed');
      return false;
    }
  } else {
    logError('No session cookie found');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     AttendanceMS Connectivity Test Suite                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  logInfo(`Testing server at: ${BASE_URL}`);
  logInfo(`Test user: ${TEST_EMAIL}\n`);

  const results = {
    healthCheck: await testHealthCheck(),
    authentication: await testAuthentication(),
    dashboardAPIs: await testDashboardAPIs(),
    classManagement: await testClassManagement(),
    analyticsAPIs: await testAnalyticsAPIs(),
    realtimeFeatures: await testRealtimeFeatures(),
    notificationSystem: await testNotificationSystem(),
    staticAssets: await testStaticAssets(),
    databaseConnection: await testDatabaseConnection(),
    sessionManagement: await testSessionManagement(),
  };

  // Summary
  logSection('Test Summary');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  const percentage = Math.round((passed / total) * 100);

  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✓ PASS' : '✗ FAIL';
    const color = result ? 'green' : 'red';
    log(`${status} - ${test}`, color);
  });

  log('\n' + '='.repeat(60), 'blue');
  log(`Overall: ${passed}/${total} tests passed (${percentage}%)`, 
      percentage === 100 ? 'green' : percentage >= 70 ? 'yellow' : 'red');
  log('='.repeat(60) + '\n', 'blue');

  if (percentage === 100) {
    log('🎉 All connectivity tests passed! System is fully connected.', 'green');
  } else if (percentage >= 70) {
    log('⚠️  Most tests passed. Some features may need attention.', 'yellow');
  } else {
    log('❌ Multiple tests failed. Please check the system configuration.', 'red');
  }

  process.exit(percentage === 100 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
