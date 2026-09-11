const mongoose = require('mongoose');
const softDelete = require('../../shared/softDelete');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, enum: [
    'Super Admin','Organization Admin','Compliance Manager','Audit Manager',
    'Auditor','Reviewer','Risk Manager','Document Manager','Vendor Manager',
    'Employee','External Company User','CA / Consultant'
  ]},
  orgId: { type: String, required: true, index: true },
  orgName: String,
  status: { type: String, enum: ['Active','Inactive','Suspended','On Leave'], default: 'Active' },
  lastLogin: Date,
  refreshToken: { type: String, select: false },
}, { timestamps: true });

userSchema.index({ orgId: 1, role: 1 });
userSchema.index({ email: 1, orgId: 1 }, { unique: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function() {
  return {
    id: this._id, email: this.email, name: this.name,
    role: this.role, orgId: this.orgId, orgName: this.orgName,
    status: this.status, lastLogin: this.lastLogin, createdAt: this.createdAt,
  };
};

userSchema.statics.createSeedUser = async function(data) {
  if (data.password && !data.password.startsWith('$2a$') && !data.password.startsWith('$2b$')) {
    data.password = await bcrypt.hash(data.password, 12);
  }
  return this.create(data);
};

userSchema.plugin(softDelete);

module.exports = mongoose.model('User', userSchema);
