const { body } = require('express-validator');
const Organization = require('../models/Organization');
const User = require('../models/User');

// POST /api/org/create — Create a new organization
const createOrg = async (req, res, next) => {
  try {
    const { name, roleTitle } = req.body;
    const userId = req.user._id;

    const org = await Organization.create({
      name,
      createdBy: userId,
      members: [{ userId, role: 'OWNER', roleTitle: roleTitle || 'Owner' }],
    });

    // Update user with org membership and set as current
    await User.findByIdAndUpdate(userId, {
      $push: { organizations: { orgId: org._id, role: 'OWNER', roleTitle: roleTitle || 'Owner' } },
      currentOrganizationId: org._id,
    });

    return res.status(201).json({
      message: 'Organization created successfully.',
      organization: {
        id: org._id,
        name: org.name,
        code: org.code,
        role: 'OWNER',
        roleTitle: roleTitle || 'Owner',
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/org/join — Join an organization using code
const joinOrg = async (req, res, next) => {
  try {
    const { code, roleTitle } = req.body;
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

    // Add user to org with roleTitle
    org.members.push({ userId, role: 'MEMBER', roleTitle: roleTitle || '' });
    await org.save();

    // Update user
    await User.findByIdAndUpdate(userId, {
      $push: { organizations: { orgId: org._id, role: 'MEMBER', roleTitle: roleTitle || '' } },
      currentOrganizationId: org._id,
    });

    return res.json({
      message: 'Joined organization successfully.',
      organization: { id: org._id, name: org.name, code: org.code, role: 'MEMBER', roleTitle: roleTitle || '' },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/org/role — Update user's role title in current organization
const updateRoleTitle = async (req, res, next) => {
  try {
    const { roleTitle } = req.body;
    const userId = req.user._id;
    const orgId = req.user.currentOrganizationId;

    if (!orgId) {
      return res.status(400).json({ message: 'No organization selected.' });
    }

    // Update in Organization
    await Organization.updateOne(
      { _id: orgId, 'members.userId': userId },
      { $set: { 'members.$.roleTitle': roleTitle || '' } }
    );

    // Update in User
    await User.updateOne(
      { _id: userId, 'organizations.orgId': orgId },
      { $set: { 'organizations.$.roleTitle': roleTitle || '' } }
    );

    return res.json({ message: 'Role updated successfully.', roleTitle: roleTitle || '' });
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
      roleTitle: o.roleTitle || '',
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

// GET /api/org/members — Get members of current organization
const getOrgMembers = async (req, res, next) => {
  try {
    const orgId = req.user.currentOrganizationId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization selected.' });
    }

    const org = await Organization.findById(orgId).populate('members.userId', 'name email avatar');
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

    const members = org.members.map((m) => ({
      _id: m.userId._id,
      name: m.userId.name,
      email: m.userId.email,
      avatar: m.userId.avatar,
      role: m.role,
      roleTitle: m.roleTitle || '',
      orgName: org.name,
      orgCode: org.code,
    }));

    return res.json({ members });
  } catch (err) {
    next(err);
  }
};

// PUT /api/org/member/:userId/role — Promote/demote member (OWNER only)
const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetUserId = req.params.userId;
    const orgId = req.user.currentOrganizationId;

    if (!orgId) {
      return res.status(400).json({ message: 'No organization selected.' });
    }

    // Verify requester is OWNER
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    const requesterMember = org.members.find(
      (m) => m.userId.toString() === req.user._id.toString()
    );
    if (!requesterMember || requesterMember.role !== 'OWNER') {
      return res.status(403).json({ message: 'Only the owner can change member roles.' });
    }

    // Cannot change own role or promote to OWNER
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role.' });
    }
    if (role === 'OWNER') {
      return res.status(400).json({ message: 'Cannot promote to owner.' });
    }
    if (!['ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be ADMIN or MEMBER.' });
    }

    // Update in Organization
    const targetMember = org.members.find((m) => m.userId.toString() === targetUserId);
    if (!targetMember) {
      return res.status(404).json({ message: 'Member not found in organization.' });
    }

    await Organization.updateOne(
      { _id: orgId, 'members.userId': targetUserId },
      { $set: { 'members.$.role': role } }
    );

    // Update in User
    await User.updateOne(
      { _id: targetUserId, 'organizations.orgId': orgId },
      { $set: { 'organizations.$.role': role } }
    );

    return res.json({ message: `Member role updated to ${role}.` });
  } catch (err) {
    next(err);
  }
};

const updateMemberRoleValidation = [
  body('role').isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER.'),
];

// Validation rules
const createOrgValidation = [
  body('name').trim().notEmpty().withMessage('Organization name is required.').isLength({ max: 120 }),
];

const joinOrgValidation = [
  body('code').trim().notEmpty().withMessage('Organization code is required.'),
  body('roleTitle').optional().trim().isLength({ max: 50 }),
];

const updateRoleTitleValidation = [
  body('roleTitle').trim().isLength({ max: 50 }).withMessage('Role title must be 50 characters or less.'),
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
  getOrgMembers,
  updateRoleTitle,
  updateMemberRole,
  createOrgValidation,
  joinOrgValidation,
  selectOrgValidation,
  updateRoleTitleValidation,
  updateMemberRoleValidation,
};
