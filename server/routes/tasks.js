const router = require('express').Router();
const { authenticate, requireFullToken, requireOtpVerified, requireOrganization } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  createTaskValidation,
  updateTaskValidation,
} = require('../controllers/taskController');

// All task routes require auth + OTP + org
router.use(authenticate, requireFullToken, requireOtpVerified, requireOrganization);

router.get('/', listTasks);
router.post('/', createTaskValidation, validate, createTask);
router.put('/:id', updateTaskValidation, validate, updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
