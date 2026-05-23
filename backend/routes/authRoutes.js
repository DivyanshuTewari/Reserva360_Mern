const express = require('express');
const router = express.Router();
const { initMaster, masterLogin, login } = require('../controllers/authController');

router.post('/init-master', initMaster);
router.post('/master-login', masterLogin);
router.post('/login', login);

module.exports = router;
