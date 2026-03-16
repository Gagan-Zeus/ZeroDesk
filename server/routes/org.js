const router = require('express').Router();
const { authenticate, requireOtpVerified } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createOrg,
  joinOrg,
  listOrgs,
  selectOrg,
  getOrg,
  createOrgValidation,
  joinOrgValidation,
  selectOrgValidation,
} = require('../controllers/orgController');

// All org routes require auth + OTP verified
router.use(authenticate, requireOtpVerified);

router.post('/create', createOrgValidation, validate, createOrg);
router.post('/join', joinOrgValidation, validate, joinOrg);
router.get('/list', listOrgs);
router.post('/select', selectOrgValidation, validate, selectOrg);
router.get('/:id', getOrg);

module.exports = router;
