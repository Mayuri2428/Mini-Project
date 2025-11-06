import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';
import { dbManager } from '../../src/database/connection.js';

describe('API Integration Tests', () => {
  let server;
  let agent;
  
  before(async () => {
    // Setup test database
    await dbManager.connect();
    
    // Create test server
    server = app.listen(0);
    agent = request.agent(server);
  });
  
  after(async () => {
    await dbManager.disconnect();
    server.close();
  });
  
  describe('Authentication API', () => {
    describe('POST /login', () => {
      it('should login with valid credentials', async () => {
        const response = await agent
          .post('/login')
          .send({
            email: 'mjsfutane21@gmail.com',
            password: 'abc@1234'
          })
          .expect(302);
        
        expect(response.headers.location).to.equal('/dashboard');
      });
      
      it('should reject invalid credentials', async () => {
        const response = await agent
          .post('/login')
          .send({
            email: 'invalid@email.com',
            password: 'wrongpassword'
          })
          .expect(302);
        
        expect(response.headers.location).to.include('/login');
      });
    });
  });
  
  describe('Health Check API', () => {
    it('should return system health', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).to.have.property('status', 'OK');
      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('uptime');
    });
  });
});