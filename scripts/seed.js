#!/usr/bin/env node

/**
 * Database Seeding Script
 * Populates database with sample data for development/testing
 */

import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/app.db');

async function seedDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    console.log('🌱 Starting database seeding...');
    
    db.serialize(() => {
      // Sample classes
      const classes = [
        ['Computer Science A', 'A', 'Computer Science', '1st', '2024-25', 'Programming Fundamentals'],
        ['Computer Science B', 'B', 'Computer Science', '1st', '2024-25', 'Data Structures'],
        ['Mathematics A', 'A', 'Mathematics', '2nd', '2024-25', 'Calculus'],
        ['Physics A', 'A', 'Physics', '2nd', '2024-25', 'Mechanics']
      ];
      
      const insertClass = db.prepare(`
        INSERT OR IGNORE INTO classes (name, section, department, semester, academic_year, subject, teacher_id)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `);
      
      classes.forEach(classData => {
        insertClass.run(classData);
      });
      insertClass.finalize();
      
      console.log('✅ Sample classes created');
      
      // Sample students
      const students = [
        ['John Doe', 'CS001', 'john.doe@student.edu', '+1234567890', 'active', '2024-25', 'Computer Science', 1],
        ['Jane Smith', 'CS002', 'jane.smith@student.edu', '+1234567891', 'active', '2024-25', 'Computer Science', 1],
        ['Mike Johnson', 'CS003', 'mike.johnson@student.edu', '+1234567892', 'active', '2024-25', 'Computer Science', 1],
        ['Sarah Wilson', 'CS004', 'sarah.wilson@student.edu', '+1234567893', 'active', '2024-25', 'Computer Science', 2],
        ['David Brown', 'CS005', 'david.brown@student.edu', '+1234567894', 'active', '2024-25', 'Computer Science', 2],
        ['Emily Davis', 'MATH001', 'emily.davis@student.edu', '+1234567895', 'active', '2024-25', 'Mathematics', 3],
        ['Robert Miller', 'MATH002', 'robert.miller@student.edu', '+1234567896', 'active', '2024-25', 'Mathematics', 3],
        ['Lisa Anderson', 'PHY001', 'lisa.anderson@student.edu', '+1234567897', 'active', '2024-25', 'Physics', 4],
        ['James Taylor', 'PHY002', 'james.taylor@student.edu', '+1234567898', 'active', '2024-25', 'Physics', 4],
        ['Maria Garcia', 'CS006', 'maria.garcia@student.edu', '+1234567899', 'active', '2024-25', 'Computer Science', 1]
      ];
      
      const insertStudent = db.prepare(`
        INSERT OR IGNORE INTO students (name, roll_no, email, phone, enrollment_status, academic_year, branch, class_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      students.forEach(studentData => {
        insertStudent.run(studentData);
      });
      insertStudent.finalize();
      
      console.log('✅ Sample students created');
      
      // Sample attendance records
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      const insertAttendance = db.prepare(`
        INSERT OR IGNORE INTO attendance (student_id, class_id, date, status, session_time, marked_at, marked_by)
        VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
      `);
      
      // Create attendance for each student for the past week
      for (let studentId = 1; studentId <= 10; studentId++) {
        const classId = studentId <= 3 ? 1 : studentId <= 5 ? 2 : studentId <= 7 ? 3 : 4;
        
        dates.forEach(date => {
          const status = Math.random() > 0.2 ? 'present' : Math.random() > 0.5 ? 'absent' : 'late';
          insertAttendance.run([studentId, classId, date, status, '09:00-10:00']);
        });
      }
      insertAttendance.finalize();
      
      console.log('✅ Sample attendance records created');
    });
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
        reject(err);
      } else {
        console.log('🎉 Database seeding completed successfully!');
        resolve();
      }
    });
  });
}

// Run seeding
seedDatabase().catch(error => {
  console.error('❌ Seeding failed:', error.message);
  process.exit(1);
});