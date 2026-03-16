const { body } = require('express-validator');
const Organization = require('../models/Organization');
const User = require('../models/User');

// POST /api/org/create — Create a new organization
const createOrg = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user._id;

    const org = await Organization.create({
      name,
      createdBy: userId,
      members: [{ userId, role: 'OWNER' }],
    });

    // Update user with org membership and set as current
    await User.findByIdAndUpdate(userId, {
      $push: { organizations: { orgId: org._id, role: 'OWNER' } },
      currentOrganizationId: org._id,
    });

    return res.status(201).json({
      message: 'Organization created successfully.',
      organization: {
        id: org._id,
        name: org.name,
        code: org.code,
        role: 'OWNER',
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/org/join — Join an organization using code
const joinOrg = async (req, res, next) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    const org = await Organization.findOne({ code: code.toUpperCase() });
    if (!org) {
      return res.status(404).json({ message: 'Invalid organization code.' });
    }

    // Check if user is already a member
    const alreadyMember = org.members.some((m) => m.userId.toString() === userId.toString());
    if (alreadyMember) {
      // Just set as current org
      await User.findByIdAndUpdate(userId, { currentOrganizationId: org._id });
      return res.json({
        message: 'Already a member. Organization set as active.',
        organization: { id: org._id, name: org.name, code: org.code, role: 'MEMBER' },
      });
    }

    // Add user to org
    org.members.push({ userId, role: 'MEMBER' });
    await org.save();

    // Update user
    await User.findByIdAndUpdate(userId, {
      $push: { organizations: { orgId: org._id, role: 'MEMBER' } },
      currentOrganizationId: org._id,
    });

    return res.json({
      message: 'Joined organization successfully.',
      organization: { id: org._id, name: org.name, code: org.code, role: 'MEMBER' },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/org/list — List user's organizations
const listOrgs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('organizations.orgId', 'name code');
    const orgs = user.organizations.map((o) => ({
      id: o.orgId._id,
      name: o.orgId.name,
      code: o.orgId.code,
      role: o.role,
    }));
    return res.json({ organizations: orgs });
  } catch (err) {
    next(err);
  }
};

// POST /api/org/select — Select an active organization
const selectOrg = async (req, res, next) => {
  try {
    const { organizationId } = req.body;
    const userId = req.user._id;

    const orgEntry = req.user.organizations.find(
      (o) => o.orgId.toString() === organizationId
    );
    if (!orgEntry) {
      return res.status(403).json({ message: 'You are not a member of this organization.' });
    }

    await User.findByIdAndUpdate(userId, { currentOrganizationId: organizationId });

    return res.json({ message: 'Organization selected.', organizationId });
  } catch (err) {
    next(err);
  }
};

// GET /api/org/:id — Get organization details
const getOrg = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id).populate('members.userId', 'name email avatar');
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    // Ensure user is a member
    const isMember = org.members.some(
      (m) => m.userId._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.json({ organization: org });
  } catch (err) {
    next(err);
  }
};

// Validation rules
const createOrgValidation = [
  body('name').trim().notEmpty().withMessage('Organization name is required.').isLength({ max: 120 }),
];

const joinOrgValidation = [
  body('code').trim().notEmpty().withMessage('Organization code is required.'),
];

const selectOrgValidation = [
  body('organizationId').isMongoId().withMessage('Valid organization ID is required.'),
];

module.exports = {
  createOrg,
  joinOrg,
  listOrgs,
  selectOrg,
  getOrg,
  createOrgValidation,
  joinOrgValidation,
  selectOrgValidation,
};
