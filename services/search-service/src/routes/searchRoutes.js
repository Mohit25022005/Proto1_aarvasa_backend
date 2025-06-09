const express = require('express');
const router = express.Router();
const { searchListings } = require('../controllers/searchController');

router.get('/search', searchListings);

module.exports = router;
