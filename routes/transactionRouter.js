const express = require('express');
const { pool } = require('../connection'); // Ensure this path is correct

const router = express.Router();

router.get('/view-transactions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions');
    res.json(rows);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Error retrieving transactions');
  }
});

module.exports = router;