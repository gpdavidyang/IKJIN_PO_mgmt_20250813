#!/usr/bin/env node
/**
 * Simple email test script to verify SMTP configuration
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmailConnection() {
  console.log('🧪 Testing Email Connection...\n');
  
  console.log('Environment Variables:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  SMTP_USER:', process.env.SMTP_USER);
  console.log('  SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
  console.log('');

  const config = {
    host: process.env.SMTP_HOST || 'smtp.naver.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    requireTLS: true,
    debug: true,
    logger: true
  };

  console.log('SMTP Configuration:');
  console.log('  Host:', config.host);
  console.log('  Port:', config.port);
  console.log('  User:', config.auth.user);
  console.log('  Pass Length:', config.auth.pass?.length || 0);
  console.log('');

  try {
    console.log('📡 Creating transporter...');
    const transporter = nodemailer.createTransport(config);

    console.log('🔍 Verifying connection...');
    const isValid = await transporter.verify();
    
    if (isValid) {
      console.log('✅ SMTP connection verified successfully!');
      
      // Try sending a test email
      console.log('📧 Sending test email...');
      const info = await transporter.sendMail({
        from: `"Test System" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, // Send to self
        subject: 'Test Email - SMTP Configuration Check',
        text: 'This is a test email to verify SMTP configuration.',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email to verify SMTP configuration.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        `
      });

      console.log('✅ Test email sent successfully!');
      console.log('  Message ID:', info.messageId);
      console.log('  Accepted:', info.accepted);
      console.log('  Rejected:', info.rejected);
      
      return true;
    }
  } catch (error) {
    console.error('❌ SMTP connection failed:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    console.error('  Command:', error.command);
    console.error('  Response Code:', error.responseCode);
    console.error('  Response:', error.response);
    
    return false;
  }
}

// Run the test
testEmailConnection()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Email system is working correctly!');
      process.exit(0);
    } else {
      console.log('\n❌ Email system has issues that need to be resolved.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });