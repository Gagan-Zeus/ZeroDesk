const { body, param } = require('express-validator');
const Task = require('../models/Task');
const Organization = require('../models/Organization');
const { sendTaskAssignedEmail } = require('../services/emailService');

// Helper to get user's role in current org
const getUserRole = async (userId, orgId) => {
  const org = await Organization.findById(orgId);
  if (!org) return null;
  const member = org.members.find((m) => m.userId.toString() === userId.toString());
  return member?.role || null;
};

// GET /api/tasks — List tasks for current organization
const listTasks = async (req, res, next) => {
  try {
    const orgId = req.organizationId;

    // All members of the organization can see all org tasks
    const tasks = await Task.find({ organizationId: orgId })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks — Create a task (OWNER or ADMIN only)
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, assignedTo, dueDate } = req.body;
    const userRole = await getUserRole(req.user._id, req.organizationId);

    if (!['OWNER', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ message: 'Only owners and admins can create tasks.' });
    }

    const task = await Task.create({
      title,
      description,
      status,
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      createdBy: req.user._id,
      organizationId: req.organizationId,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email');

    if (populatedTask?.assignedTo?.email) {
      const org = await Organization.findById(req.organizationId).select('name');
      sendTaskAssignedEmail({
        to: populatedTask.assignedTo.email,
        assigneeName: populatedTask.assignedTo.name,
        createdByName: populatedTask.createdBy?.name,
        organizationName: org?.name,
        task: populatedTask,
      }).catch((emailErr) => {
        console.error('Failed to send task assignment email:', emailErr);
      });
    }

    return res.status(201).json({ task: populatedTask });
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id — Update a task (status change only by assigned user)
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const userRole = await getUserRole(req.user._id, req.organizationId);
    const isAssignedUser = task.assignedTo?.toString() === req.user._id.toString();
    const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(userRole);

    const { title, description, status, assignedTo, dueDate } = req.body;

    // Status can only be changed by assigned user
    if (status !== undefined && status !== task.status) {
      if (!isAssignedUser) {
        return res.status(403).json({ message: 'Only the assigned user can change task status.' });
      }
    }

    // Title, description, assignedTo, dueDate can be changed by OWNER/ADMIN
    if ((title !== undefined || description !== undefined || assignedTo !== undefined || dueDate !== undefined) && !isOwnerOrAdmin) {
      return res.status(403).json({ message: 'Only owners and admins can edit task details.' });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined && isOwnerOrAdmin) task.assignedTo = assignedTo;
    if (dueDate !== undefined && isOwnerOrAdmin) task.dueDate = dueDate || null;

    await task.save();
    return res.json({ task });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id — Delete a task (OWNER only, task must be DONE)
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const userRole = await getUserRole(req.user._id, req.organizationId);

    // Only OWNER can delete
    if (userRole !== 'OWNER') {
      return res.status(403).json({ message: 'Only the owner can delete tasks.' });
    }

    // Task must be DONE to delete
    if (task.status !== 'DONE') {
      return res.status(400).json({ message: 'Task must be completed (DONE) before it can be deleted.' });
    }

    await Task.findByIdAndDelete(task._id);

    return res.json({ message: 'Task deleted.' });
  } catch (err) {
    next(err);
  }
};

// Validation
const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.').isLength({ max: 200 }),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']),
  body('dueDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Due date must be a valid date.'),
];

const updateTaskValidation = [
  param('id').isMongoId(),
  body('title').optional().trim().isLength({ max: 200 }),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']),
  body('dueDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Due date must be a valid date.'),
];

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  createTaskValidation,
  updateTaskValidation,
};
