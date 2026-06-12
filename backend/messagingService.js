const twilio = require('twilio');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
require('dotenv').config();

// Initialize Twilio client for SMS
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

// Initialize email transporter (using nodemailer which can work with SendGrid, Mailgun, or SMTP)
let emailTransporter = null;

if (process.env.SENDGRID_API_KEY) {
  // Using SendGrid
  emailTransporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
} else if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
  // Using Mailgun
  emailTransporter = nodemailer.createTransport({
    host: `smtp.mailgun.org`,
    port: 587,
    auth: {
      user: process.env.MAILGUN_DOMAIN,
      pass: process.env.MAILGUN_API_KEY
    }
  });
} else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  // Using custom SMTP
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Send SMS via Twilio
 * @param {string} to - Phone number to send to
 * @param {string} message - Message content
 * @returns {Promise<Object>} - Result of the send operation
 */
async function sendSMS(to, message) {
  if (!twilioClient) {
    throw new Error('Twilio is not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    
    return {
      success: true,
      messageId: result.sid,
      channel: 'sms',
      provider: 'twilio'
    };
  } catch (error) {
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}

/**
 * Send WhatsApp message via WhatsApp Business API
 * @param {string} to - Phone number to send to (in international format)
 * @param {string} message - Message content
 * @returns {Promise<Object>} - Result of the send operation
 */
async function sendWhatsApp(to, message) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('WhatsApp Business API is not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send WhatsApp message');
    }

    return {
      success: true,
      messageId: data.messages[0].id,
      channel: 'whatsapp',
      provider: 'whatsapp_business_api'
    };
  } catch (error) {
    throw new Error(`Failed to send WhatsApp message: ${error.message}`);
  }
}

/**
 * Send email via configured email service (SendGrid/Mailgun/SMTP)
 * @param {string} to - Email address to send to
 * @param {string} subject - Email subject
 * @param {string} message - Email body (HTML or plain text)
 * @param {boolean} isHTML - Whether the message is HTML
 * @returns {Promise<Object>} - Result of the send operation
 */
async function sendEmail(to, subject, message, isHTML = false) {
  if (!emailTransporter) {
    throw new Error('Email service is not configured. Please configure SendGrid, Mailgun, or SMTP.');
  }

  try {
    const result = await emailTransporter.sendMail({
      from: process.env.SENDGRID_FROM_EMAIL || process.env.MAILGUN_FROM_EMAIL || process.env.SMTP_FROM_EMAIL,
      to: to,
      subject: subject,
      [isHTML ? 'html' : 'text']: message
    });
    
    return {
      success: true,
      messageId: result.messageId,
      channel: 'email',
      provider: emailTransporter.options.host?.includes('sendgrid') ? 'sendgrid' : 
               emailTransporter.options.host?.includes('mailgun') ? 'mailgun' : 'smtp'
    };
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send communication based on channel
 * @param {Object} communication - Communication object with channel, audience, subject, message
 * @returns {Promise<Object>} - Result of the send operation
 */
async function sendCommunication(communication) {
  const { channel, audience, subject, message } = communication;
  
  // For now, we'll simulate sending to a single recipient
  // In a real implementation, you would look up actual member contacts based on audience
  const recipient = {
    notice: 'admin@example.com', // For notice channel, we might log or store internally
    sms: '+254700000000',        // Placeholder - should be looked up from member data
    email: 'member@example.com', // Placeholder - should be looked up from member data
    whatsapp: '+254700000000'    // Placeholder - should be looked up from member data
  }[channel.toLowerCase()];
  
  if (!recipient) {
    throw new Error(`Unsupported channel: ${channel}`);
  }

  switch (channel.toLowerCase()) {
    case 'notice':
      // For notice channel, we just store in database (already handled)
      return {
        success: true,
        messageId: 'notice-stored',
        channel: 'notice',
        provider: 'internal'
      };
      
    case 'sms':
      return await sendSMS(recipient, message);
      
    case 'email':
      return await sendEmail(recipient, subject || 'Message from SACCO', message);
      
    case 'whatsapp':
      return await sendWhatsApp(recipient, message);
      
    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
}

module.exports = {
  sendSMS,
  sendWhatsApp,
  sendEmail,
  sendCommunication
};