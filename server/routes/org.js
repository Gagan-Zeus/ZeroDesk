const router = require('express').Router();
const { authenticate, requireOtpVerified } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createOrg,
  joinOrg,
  listOrgs,
  selectOrg,
  getOrg,
  getOrgMembers,
  updateRoleTitle,
  createOrgValidation,
  joinOrgValidation,
  selectOrgValidation,
  updateRoleTitleValidation,
} = require('../controllers/orgController');

// All org routes require auth + OTP verified
router.use(authenticate, requireOtpVerified);

router.post('/create', createOrgValidation, validate, createOrg);
router.post('/join', joinOrgValidation, validate, joinOrg);
router.get('/list', listOrgs);
router.get('/members', getOrgMembers);
router.post('/select', selectOrgValidation, validate, selectOrg);
router.put('/role', updateRoleTitleValidation, validate, updateRoleTitle);
router.get('/:id', getOrg);

module.exports = router;
