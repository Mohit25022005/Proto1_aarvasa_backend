const User = require('../models/userModel');

// Define pricing logic based on Aarvasa's models
const getSubscriptionPrice = (role, plan, propertyValue) => {
  const ownerPricing = {
    'basic': { '<40L': 1999, '40-60L': 2499, '60-90L': 3499, '>90L': 5499 },
    'standard': { '<40L': 2499, '40-60L': 2999, '60-90L': 4199, '>90L': 5499 },
    'premium': { '<40L': 0, '40-60L': 4999, '60-90L': 5999, '>90L': 8499 },
    'premium-plus': { '<40L': 0, '40-60L': 6499, '60-90L': 8499, '>90L': 9999 },
  };
  const renterPricing = {
    'basic': { '<5K': 499, '5-15K': 999, '15-40K': 1799, '>40K': 2499 },
    'standard': { '<5K': 0, '5-15K': 1999, '15-40K': 2999, '>40K': 4499 },
    'premium': { '<5K': 0, '5-15K': 2999, '15-40K': 4999, '>40K': 6999 },
    'premium-plus': { '<5K': 0, '5-15K': 5999, '15-40K': 6999, '>40K': 8999 },
  };
  const agentPricing = {
    'abas-1m': 10500,
    'abas-6m': 66000,
    'abas-12m': 124000,
  };

  if (role === 'owner') {
    let range;
    if (propertyValue < 4000000) range = '<40L';
    else if (propertyValue <= 6000000) range = '40-60L';
    else if (propertyValue <= 9000000) range = '60-90L';
    else range = '>90L';
    return ownerPricing[plan][range] || 0;
  } else if (role === 'renter') {
    let range;
    if (propertyValue < 5000) range = '<5K';
    else if (propertyValue <= 15000) range = '5-15K';
    else if (propertyValue <= 40000) range = '15-40K';
    else range = '>40K';
    return renterPricing[plan][range] || 0;
  } else if (role === 'agent') {
    return agentPricing[plan] || 0;
  }
  return 0;
};

const subscribe = async (req, res, next) => {
  try {
    const { plan, propertyValue } = req.body; // propertyValue in INR (rent or sale price)
    const userId = req.user.id; // Assuming authMiddleware sets req.user
    const user = await User.findByPk(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const price = getSubscriptionPrice(user.role, plan, propertyValue);
    if (price === 0 && plan !== 'non-subscriber') {
      return res.status(400).json({ message: 'Invalid plan or property value' });
    }

    // Set subscription expiry (1 month for most plans, 6/12 months for ABAS)
    let expiryDays;
    if (plan === 'abas-6m') expiryDays = 180;
    else if (plan === 'abas-12m') expiryDays = 365;
    else expiryDays = 30;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // Update user subscription
    user.subscriptionPlan = plan;
    user.subscriptionExpiry = expiryDate;
    if (plan.startsWith('abas')) {
      user.contactsAccess = plan === 'abas-1m' ? 30 : plan === 'abas-6m' ? 200 : 400;
    }
    await user.save();

    res.status(200).json({ message: 'Subscribed successfully', price, expiry: expiryDate });
  } catch (error) {
    next(error);
  }
};

module.exports = { subscribe };