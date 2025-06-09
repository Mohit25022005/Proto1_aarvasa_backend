const { basicSearch } = require('../services/searchEngine');

const searchListings = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const listings = await basicSearch(query);
    res.json({ results: listings });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { searchListings };
