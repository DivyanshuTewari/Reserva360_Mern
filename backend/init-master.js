const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function init() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("Error: MONGO_URI is not defined in .env file");
      process.exit(1);
    }
    
    console.log("Connecting to MongoDB at " + process.env.MONGO_URI + "...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully!");

    const masterExists = await User.findOne({ role: 'master' });
    if (masterExists) {
      console.log("Master user already exists: " + masterExists.email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Dt@12master', salt);

    const masterUser = await User.create({
      name: 'Master Developer',
      email: 'divyanshudemy2005@gmail.com',
      password: hashedPassword,
      role: 'master',
    });

    console.log("Master user successfully initialized!");
    console.log("Email: " + masterUser.email);
    console.log("Password: Dt@12master");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing master user:", error);
    process.exit(1);
  }
}

init();
