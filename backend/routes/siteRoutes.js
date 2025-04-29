const express = require("express");
const router = express.Router();
const Site = require("../models/Site");

const https = require("https");

async function checkSSL(domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      method: "GET",
      port: 443,
      timeout: 3000,
    };

    const req = https.request(options, (res) => {
      resolve(true);
    });

    req.on("error", (e) => {
      resolve(false);
    });

    req.end();
  });
}

const axios = require("axios");

async function checkDomainAge(domain) {
  try {
    const apiKey = process.env.WHOIS_API_KEY;
    const response = await axios.get(
      `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=JSON`
    );

    if (
      !response.data.WhoisRecord ||
      !response.data.WhoisRecord.createdDateNormalized
    ) {
      console.error(`Whois API missing creation date for domain: ${domain}`);
      return { monthsDifference: 999, createdDate: null };
    }

    const createdDate = new Date(
      response.data.WhoisRecord.createdDateNormalized
    );
    const today = new Date();

    const monthsDifference =
      (today.getFullYear() - createdDate.getFullYear()) * 12 +
      (today.getMonth() - createdDate.getMonth());

    return { monthsDifference, createdDate };
  } catch (error) {
    console.error("Error checking domain age:", error.message);
    return { monthsDifference: 999, createdDate: null };
  }
}

const suspiciousKeywords = [
  "login",
  "verify",
  "secure",
  "account",
  "bank",
  "update",
  "password",
  "paypal",
];

function hasSuspiciousKeywords(domain) {
  return suspiciousKeywords.some((keyword) =>
    domain.toLowerCase().includes(keyword)
  );
}

async function checkSafeBrowsing(rawUrl) {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  const url = rawUrl.startsWith("http") ? rawUrl : `http://${rawUrl}`; // ensure scheme
  const body = {
    client: { clientId: "clean-the-web", clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };
  try {
    const { data } = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      body,
      { headers: { "Content-Type": "application/json" } }
    );
    console.log("SafeBrowsing result for", url, data);
    return Array.isArray(data.matches) && data.matches.length > 0;
  } catch (err) {
    // if you get a 4xx/5xx, inspect err.response.data
    console.error("Safe Browsing error:", err.response?.data || err.message);
    return false;
  }
}

router.post("/reportSite", async (req, res) => {
  const { domain } = req.body;

  try {
    let site = await Site.findOne({ domain });
    if (site) {
      site.reports += 1;
      site.lastReported = Date.now();
      await site.save();
    } else {
      site = new Site({ domain });
      await site.save();
    }
    res.status(200).json({ message: "✅ Site reported successfully" });
  } catch (err) {
    console.error("Error reporting site:", err);
    res
      .status(500)
      .json({ message: "❌ Error reporting site", error: err.message });
  }
});

router.get("/checkSite", async (req, res) => {
  const { domain, fullUrl } = req.query;

  try {
    let trustScore = 100;
    const reasons = [];

    const site = await Site.findOne({ domain });

    // SSL Check
    const ssl = await checkSSL(domain);
    if (!ssl) {
      trustScore -= 40;
      reasons.push("No SSL certificate (–40)");
    }

    // Domain Age Check
    const { monthsDifference, createdDate } = await checkDomainAge(domain);

    if (monthsDifference !== 999) {
      if (monthsDifference < 1) {
        trustScore -= 50;
        reasons.push(`Domain age is ${monthsDifference} month(s) (–50)`);
      } else if (monthsDifference < 3) {
        trustScore -= 40;
        reasons.push(`Domain age is ${monthsDifference} month(s) (–40)`);
      } else if (monthsDifference < 6) {
        trustScore -= 30;
        reasons.push(`Domain age is ${monthsDifference} months (–30)`);
      }

      // Save creation date if we got it
      if (site && !site.domainCreatedAt && createdDate) {
        site.domainCreatedAt = createdDate;
        await site.save();
      }
    }

    // Suspicious Keywords Check
    if (hasSuspiciousKeywords(domain)) {
      trustScore -= 20;
      reasons.push("Found suspicious keyword in domain (–20)");
    }

    // User Reports Check
    if (site) {
      const penalty = site.reports * 10;
      trustScore -= penalty;
      reasons.push(`${site.reports} user(s) reported (–${penalty})`);
    }

    // Google Safe Browsing Check
    const urlToCheck = fullUrl
      ? fullUrl.startsWith("http")
        ? fullUrl
        : `http://${fullUrl}`
      : `http://${domain}`;
    console.log("→ Checking SafeBrowsing for URL:", urlToCheck);

    const isUnsafe = await checkSafeBrowsing(urlToCheck);
    if (isUnsafe) {
      trustScore = 0;
      reasons.push("Flagged by Google Safe Browsing");
    }

    trustScore = Math.max(0, trustScore); // Don't allow negative trust score

    if (reasons.length === 0) {
      reasons.push("No issues detected");
    }

    let status = "Safe";
    if (trustScore < 80) status = "Suspicious";
    if (trustScore < 50) status = "Scam";

    res.status(200).json({ trustScore, status, reasons });
  } catch (error) {
    console.error("Error checking site:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
