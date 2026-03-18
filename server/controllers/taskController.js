const { body, param } = require('express-validator');
const Task = require('../models/Task');
const Organization = require('../models/Organization');

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
    const { title, description, status, assignedTo } = req.body;
    const userRole = await getUserRole(req.user._id, req.organizationId);

    if (!['OWNER', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ message: 'Only owners and admins can create tasks.' });
    }

    const task = await Task.create({
      title,
      description,
      status,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      organizationId: req.organizationId,
    });

    return res.status(201).json({ task });
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

    const { title, description, status, assignedTo } = req.body;

    // Status can only be changed by assigned user
    if (status !== undefined && status !== task.status) {
      if (!isAssignedUser) {
        return res.status(403).json({ message: 'Only the assigned user can change task status.' });
      }
    }

    // Title, description, assignedTo can be changed by OWNER/ADMIN
    if ((title !== undefined || description !== undefined || assignedTo !== undefined) && !isOwnerOrAdmin) {
      return res.status(403).json({ message: 'Only owners and admins can edit task details.' });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined && isOwnerOrAdmin) task.assignedTo = assignedTo;

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
];

const updateTaskValidation = [
  param('id').isMongoId(),
  body('title').optional().trim().isLength({ max: 200 }),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']),
];

module.exports = {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  createTaskValidation,
  updateTaskValidation,
};
