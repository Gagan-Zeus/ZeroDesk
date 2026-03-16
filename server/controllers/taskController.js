const { body, param } = require('express-validator');
const Task = require('../models/Task');

// GET /api/tasks — List tasks for current organization
const listTasks = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const userRole = req.user.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    )?.role;

    let query = { organizationId: orgId };

    // MEMBER can only see their own or assigned tasks
    if (userRole === 'MEMBER') {
      query.$or = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks — Create a task
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, assignedTo } = req.body;

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

// PUT /api/tasks/:id — Update a task
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const { title, description, status, assignedTo } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;

    await task.save();
    return res.json({ task });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id — Delete a task
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      organizationId: req.organizationId,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

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
