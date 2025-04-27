const express = require("express");
const router = express.Router();
const Site = require("../models/Site");

router.post("/reportSite", async (req, res) => {
  const { domain } = req.body;

  try {
    let site = await Site.findOne({ domain });
    if (!site) {
      site.reports += 1;
      site.lastReported = Date.now();
      await site.save();
    } else {
      site = new Site({ domain });
      await site.save();
    }
    res.status(200).json({ message: "Site reported successfully", site });
  } catch (error) {
    console.error("Error reporting site:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/checkSite", async (req, res) => {
  const { domain } = req.query;

  try {
    const site = await Site.findOne({ domain });
    if (!site) {
      return res.status(200).json({ trustScore: 100, status: "Safe" });
    }

    let trustScore = 100 - site.reports * 10;
    let status = "Safe";
    if (trustScore < 80) status = "Suspicious";
    if (trustScore < 50) status = "Scam";
    res.status(200).json({ trustScore, status });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
