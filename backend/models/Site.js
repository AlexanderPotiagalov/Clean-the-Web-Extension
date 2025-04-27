const mongoose = require("mongoose");
const siteSchema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true },
  reports: { type: Number, default: 0 },
  lastReported: { type: Date, default: Date.now },
  domainCreatedAt: { type: Date, default: null },
});

module.exports = mongoose.model("Site", siteSchema);
