const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('Connected to MongoDB');
    // Start background jobs
    const startSubscriptionCleaner = require('./jobs/subscriptionCleaner');
    startSubscriptionCleaner();
})
.catch(err => console.error('MongoDB connection error:', err));

// Basic route
app.get('/', (req, res) => {
    res.send('Reserva360 API is running...');
});

// Define routes here
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/master', require('./routes/masterRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
