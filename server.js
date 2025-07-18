require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow requests from these origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'null' // for file:// URLs
        ];

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthify', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
mongoose.connection.on('connected', () => {
    console.log('MongoDB connected ✅');
});
mongoose.connection.on('error', (err) => {
    console.error('MongoDB error ❌:', err);
});

// User model
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    calorie_goal: { type: Number, default: 2000 },
    daily_calories: {
        current: {
            date: { type: String, default: () => new Date().toISOString().split('T')[0] },
            consumed: { type: Number, default: 0 }
        },
        history: [{
            date: String,
            consumed: Number,
            goal: Number
        }]
    },
    createdAt: { type: Date, default: Date.now },
}));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Auth middleware
const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.startsWith('Bearer ') ?
            authHeader.replace('Bearer ', '') :
            authHeader;

        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Authentication required' });
    }
};

// Routes

// Signup route
app.post('/signup', async(req, res) => {
    try {
        const { name, email, password, calorie_goal } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            calorie_goal: calorie_goal || 2000,
        });

        await newUser.save();

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                calorie_goal: newUser.calorie_goal,
                createdAt: newUser.createdAt
            }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Register route (for backward compatibility)
app.post('/register', async(req, res) => {
    try {
        const { name, email, password, calorie_goal } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            calorie_goal: calorie_goal || 2000,
        });

        await newUser.save();

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                calorie_goal: newUser.calorie_goal,
                createdAt: newUser.createdAt
            }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login route
app.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {
            expiresIn: '7d' // Longer expiration (7 days)
        });

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                calorie_goal: user.calorie_goal,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user by ID
app.get('/api/user/:id', async(req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            calorie_goal: user.calorie_goal,
            createdAt: user.createdAt
        });
    } catch (err) {
        console.error('User fetch error:', err);
        res.status(500).json({ message: 'Error fetching user' });
    }
});

// Get current user endpoint
app.get('/api/user/current', auth, async(req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            calorie_goal: user.calorie_goal,
            daily_calories: user.daily_calories,
            createdAt: user.createdAt
        });
    } catch (err) {
        console.error('Current user fetch error:', err);
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

// Add the missing calorie endpoint for fallback
app.get('/api/user/calories', auth, async(req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if we need to reset to a new day
        const today = new Date().toISOString().split('T')[0];
        if (user.daily_calories.current.date !== today) {
            // Move current day to history
            if (user.daily_calories.current.consumed > 0) {
                user.daily_calories.history.push({
                    date: user.daily_calories.current.date,
                    consumed: user.daily_calories.current.consumed,
                    goal: user.calorie_goal
                });
            }

            // Reset current day
            user.daily_calories.current = {
                date: today,
                consumed: 0
            };
            await user.save();
        }

        // Return current calorie data
        res.json({
            success: true,
            current: user.daily_calories.current,
            goal: user.calorie_goal
        });
    } catch (err) {
        console.error('Get user calories error:', err);
        res.status(500).json({ message: 'Error getting calorie data' });
    }
});

// Update calorie goal endpoint
app.put('/api/calories/goal', auth, async(req, res) => {
    try {
        const { goal } = req.body;
        const user = await User.findById(req.userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        user.calorie_goal = Number(goal);
        await user.save();

        res.json({
            success: true,
            new_goal: user.calorie_goal
        });
    } catch (err) {
        console.error('Update goal error:', err);
        res.status(500).json({ message: 'Error updating calorie goal' });
    }
});

// Get calories endpoint
app.get('/api/calories', auth, async(req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if we need to reset to a new day
        const today = new Date().toISOString().split('T')[0];
        if (user.daily_calories.current.date !== today) {
            // Move current day to history
            if (user.daily_calories.current.consumed > 0) {
                user.daily_calories.history.push({
                    date: user.daily_calories.current.date,
                    consumed: user.daily_calories.current.consumed,
                    goal: user.calorie_goal
                });
            }

            // Reset current day
            user.daily_calories.current = {
                date: today,
                consumed: 0
            };
            await user.save();
        }

        // Return current calorie data
        res.json({
            success: true,
            current: user.daily_calories.current,
            goal: user.calorie_goal
        });
    } catch (err) {
        console.error('Get calories error:', err);
        res.status(500).json({ message: 'Error getting calorie data' });
    }
});

// Add calories endpoint
app.post('/api/calories/add', auth, async(req, res) => {
    try {
        const { calories } = req.body;
        const user = await User.findById(req.userId);

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if we need to reset to a new day
        const today = new Date().toISOString().split('T')[0];
        if (user.daily_calories.current.date !== today) {
            // Move current day to history
            if (user.daily_calories.current.consumed > 0) {
                user.daily_calories.history.push({
                    date: user.daily_calories.current.date,
                    consumed: user.daily_calories.current.consumed,
                    goal: user.calorie_goal
                });
            }

            // Reset current day
            user.daily_calories.current = {
                date: today,
                consumed: calories
            };
        } else {
            // Add to current day
            user.daily_calories.current.consumed += calories;
        }

        await user.save();

        res.json({
            success: true,
            current: user.daily_calories.current,
            goal: user.calorie_goal
        });
    } catch (err) {
        console.error('Add calories error:', err);
        res.status(500).json({ message: 'Error adding calories' });
    }
});

// Get weekly summary endpoint
app.get('/api/calories/weekly', auth, async(req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Get last 7 days of history (including today)
        const weeklyData = user.daily_calories.history
            .slice(-6) // Get last 6 days from history
            .concat([{
                date: user.daily_calories.current.date,
                consumed: user.daily_calories.current.consumed,
                goal: user.calorie_goal
            }])
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            days: weeklyData,
            average_consumed: weeklyData.reduce((sum, day) => sum + day.consumed, 0) / weeklyData.length,
            average_goal: weeklyData.reduce((sum, day) => sum + day.goal, 0) / weeklyData.length
        });
    } catch (err) {
        console.error('Weekly summary error:', err);
        res.status(500).json({ message: 'Error getting weekly data' });
    }
});

// Reset today's calories endpoint
app.post('/api/calories/reset', auth, async(req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Move current day to history if it has data
        if (user.daily_calories.current.consumed > 0) {
            user.daily_calories.history.push({
                date: user.daily_calories.current.date,
                consumed: user.daily_calories.current.consumed,
                goal: user.calorie_goal
            });
        }

        // Reset current day
        user.daily_calories.current = {
            date: new Date().toISOString().split('T')[0],
            consumed: 0
        };

        await user.save();

        res.json({
            success: true,
            current: user.daily_calories.current
        });
    } catch (err) {
        console.error('Reset calories error:', err);
        res.status(500).json({ message: 'Error resetting calories' });
    }
});

// Token refresh endpoint
app.post('/api/token/refresh', async(req, res) => {
    try {
        const token = req.cookies.token || (req.header('Authorization') ? req.header('Authorization').replace('Bearer ', '') : null);
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const newToken = jwt.sign({ userId: user._id, email: user.email },
            JWT_SECRET, { expiresIn: '7d' }
        );

        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            token: newToken
        });
    } catch (err) {
        console.error('Token refresh error:', err);
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Get user by email (NEW ENDPOINT)
app.get('/api/user/email/:email', auth, async(req, res) => {
    try {
        const email = req.params.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            calorie_goal: user.calorie_goal,
            createdAt: user.createdAt
        });
    } catch (err) {
        console.error('User fetch by email error:', err);
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});