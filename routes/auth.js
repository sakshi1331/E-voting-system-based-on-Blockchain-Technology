const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp) => {
    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: email,
            subject: 'Email Verification OTP - E-Voting System',
            html: `<h2>Email Verification</h2><p>Your One-Time Password (OTP) for email verification is:</p><h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px;">${otp}</h1><p>This OTP is valid for ${process.env.OTP_EXPIRY} minutes.</p><p>If you didn't request this, please ignore this email.</p><hr><p><small>E-Voting System | ${process.env.COLLEGE_NAME}</small></p>`
        });
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('studentId').notEmpty(),
    body('department').notEmpty(),
    body('semester').isInt(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation error', errors: errors.array() });
        }

        const { email, password, firstName, lastName, studentId, department, semester } = req.body;
        if (!email.endsWith(process.env.COLLEGE_EMAIL_DOMAIN)) {
            return res.status(400).json({ message: 'Please use your college email address' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY) * 60000);

        const user = new User({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            studentId,
            department,
            semester,
            otp,
            otpExpiry,
            walletAddress: req.body.walletAddress || '',
        });

        await user.save();

        const emailSent = await sendOTPEmail(email, otp);
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send verification email' });
        }

        res.status(201).json({ message: 'Registration successful. Please check your email for OTP.', email });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
});

router.post('/verify-otp', [
    body('email').isEmail().normalizeEmail(),
    body('otp').notEmpty(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation error', errors: errors.array() });
        }

        const { email, otp } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
});

router.post('/resend-otp', [
    body('email').isEmail().normalizeEmail(),
], async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY) * 60000);
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        const emailSent = await sendOTPEmail(email, otp);
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send verification email' });
        }

        res.json({ message: 'OTP resent successfully' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
    }
});

router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation error', errors: errors.array() });
        }

        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: 'Please verify your email first' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });
        res.json({ message: 'Login successful', accessToken: token, student: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, studentId: user.studentId, department: user.department, semester: user.semester } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

module.exports = router;