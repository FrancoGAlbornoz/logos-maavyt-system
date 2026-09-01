const express = require('express');
const router = express.Router();
const { previewParser, importVouchers } = require('../controllers/parserController');

router.post('/preview', previewParser);
router.post('/import', importVouchers);

module.exports = router;
