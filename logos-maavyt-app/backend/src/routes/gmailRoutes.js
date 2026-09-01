const express = require('express');
const router = express.Router();
const { syncGmail, getGmailStatus } = require('../controllers/gmailController');

router.post('/sync', syncGmail);
router.get('/status', getGmailStatus);

module.exports = router;
