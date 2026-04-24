const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Placeholder for user database (you should replace this with your actual database code)
let users = [];

// Registration route
router.post('/register', (req, res) => {
    const { email, password } = req.body;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    users.push({ email, password, verified: false, verificationToken });
    
    // Send verification email
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email provider
        auth: {
            user: 'your-email@example.com', // Your email
            pass: 'your-email-password' // Your email password
        }
    });

    const mailOptions = {
        from: 'your-email@example.com',
        to: email,
        subject: 'Email Verification',
        text: `Please verify your email by clicking the link: http://localhost:3000/verify/${verificationToken}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.status(200).send('Verification email sent. Please check your inbox.');
    });
});

// Verification route
router.get('/verify/:token', (req, res) => {
    const { token } = req.params;
    const user = users.find(u => u.verificationToken === token);
    if (user) {
        user.verified = true;
        res.status(200).send('Email verification successful.');
    } else {
        res.status(400).send('Invalid or expired verification token.');
    }
});

// Export the router
module.exports = router;