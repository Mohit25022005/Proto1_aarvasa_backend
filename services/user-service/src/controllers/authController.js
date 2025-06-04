const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const redisClient = require('../config/redis');

const signup = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword, role });
    
    // Cache user session
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await redisClient.setEx(`session:${user.id}`, 3600, token);
    
    res.status(201).json({ message: 'User created', token });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await redisClient.setEx(`session:${user.id}`, 3600, token);
    
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login };