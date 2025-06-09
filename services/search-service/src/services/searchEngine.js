const pool = require('../config/db');

const basicSearch = async (query) => {
  try {
    const text = `
      SELECT * FROM listings
      WHERE title ILIKE $1 OR description ILIKE $1 OR city ILIKE $1
      LIMIT 20
    `;
    const values = [`%${query}%`];

    const result = await pool.query(text, values);
    return result.rows;
  } catch (err) {
    console.error('Search query failed:', err);
    throw err;
  }
};

module.exports = { basicSearch };
