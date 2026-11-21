const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateAgent } = require('../middleware/auth');

/**
 * GET /api/holidays
 * Get list of all festival holidays
 */
router.get('/', authenticateAgent, async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' }
    });
    return res.json({ holidays });
  } catch (error) {
    console.error('Fetch holidays error:', error);
    return res.status(500).json({ error: 'Failed to fetch holidays.' });
  }
});

/**
 * POST /api/holidays
 * Add a new festival holiday
 */
router.post('/', authenticateAgent, async (req, res) => {
  try {
    const { name, date, description } = req.body;

    if (!name || !date) {
      return res.status(400).json({ error: 'Holiday name and date (YYYY-MM-DD) are required.' });
    }

    const existing = await prisma.holiday.findUnique({
      where: { date }
    });

    if (existing) {
      return res.status(400).json({ error: `A holiday on date ${date} already exists (${existing.name}).` });
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: name.trim(),
        date: date.trim(),
        description: description ? description.trim() : null
      }
    });

    return res.status(201).json({
      message: 'Holiday added successfully',
      holiday
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    return res.status(500).json({ error: 'Failed to add holiday.' });
  }
});

/**
 * DELETE /api/holidays/:id
 * Remove a holiday
 */
router.delete('/:id', authenticateAgent, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.holiday.delete({ where: { id } });
    return res.json({ message: 'Holiday removed successfully.' });
  } catch (error) {
    console.error('Delete holiday error:', error);
    return res.status(500).json({ error: 'Failed to delete holiday.' });
  }
});

module.exports = router;
