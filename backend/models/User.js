const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['master', 'admin', 'user'], 
    required: true 
  },
  hotelId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hotel',
    required: function() { return this.role === 'admin' || this.role === 'user'; }
  },
  securityQuestion: { type: String },
  securityAnswer: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
