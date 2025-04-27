document.addEventListener("DOMContentLoaded", async () => {
  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let url = new URL(tab.url);
    const domain = url.hostname;

    document.getElementById("site-name").innerText = domain;

    // Show loading state
    const scoreCircle = document.getElementById("score-circle");
    const percentageText = document.getElementById("percentage");
    const statusText = document.getElementById("status-text");

    scoreCircle.classList.add("loading-animation");
    percentageText.innerText = "?";
    percentageText.classList.add("loading-animation");
    statusText.innerText = "Checking site safety...";
    statusText.classList.add("loading-animation");

    const response = await fetch(
      `http://localhost:5000/api/checkSite?domain=${domain}`
    );
    const data = await response.json();

    // Remove loading animations
    scoreCircle.classList.remove("loading-animation");
    percentageText.classList.remove("loading-animation");
    statusText.classList.remove("loading-animation");

    if (!data || !data.status) {
      setUnknownState();
      return;
    }

    const { trustScore, status } = data;

    // Calculate circle fill based on percentage
    const circumference = 2 * Math.PI * 60; // r=60
    const dashOffset = circumference - (circumference * trustScore) / 100;
    scoreCircle.style.strokeDashoffset = dashOffset;

    // Update the percentage text
    percentageText.innerText = `${trustScore}%`;

    // Set colors and status text based on the status
    if (status === "Safe") {
      setStatusStyles("safe", `✅ Site is Safe`);
    } else if (status === "Suspicious") {
      setStatusStyles("suspicious", `⚠️ Site is Suspicious`);
    } else if (status === "Scam") {
      setStatusStyles("scam", `❌ Site is Scam`);
    }

    // Report button
    document
      .getElementById("report-btn")
      .addEventListener("click", async () => {
        try {
          const reportButton = document.getElementById("report-btn");
          const originalText = reportButton.innerHTML;
          reportButton.innerHTML = `<span>Reporting...</span>`;
          reportButton.disabled = true;

          const reportResponse = await fetch(
            "http://localhost:5000/api/reportSite",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ domain }),
            }
          );

          const reportData = await reportResponse.json();

          reportButton.innerHTML = `<span>✓ Reported</span>`;
          setTimeout(() => {
            reportButton.innerHTML = originalText;
            reportButton.disabled = false;
          }, 2000);

          alert(reportData.message);
        } catch (err) {
          console.error("Error reporting site:", err);

          const reportButton = document.getElementById("report-btn");
          reportButton.innerHTML = `<span>❌ Failed</span>`;
          setTimeout(() => {
            reportButton.innerHTML = `<span class="flag-icon">🚩</span> Report This Site`;
            reportButton.disabled = false;
          }, 2000);

          alert("❌ Failed to report site.");
        }
      });
  } catch (error) {
    console.error("Error loading site info:", error);
    document.getElementById("site-name").innerText = "Unable to load site";
    setUnknownState();
  }
});

function setUnknownState() {
  const scoreCircle = document.getElementById("score-circle");
  const percentageText = document.getElementById("percentage");
  const statusText = document.getElementById("status-text");

  scoreCircle.classList.remove("safe-color", "suspicious-color", "scam-color");
  scoreCircle.classList.add("unknown-color");

  percentageText.classList.remove(
    "safe-color",
    "suspicious-color",
    "scam-color"
  );
  percentageText.classList.add("unknown-color");
  percentageText.innerText = "?";

  statusText.classList.remove("safe-color", "suspicious-color", "scam-color");
  statusText.classList.add("unknown-color");
  statusText.innerText = "❓ Unable to verify site";
}

function setStatusStyles(type, message) {
  const scoreCircle = document.getElementById("score-circle");
  const percentageText = document.getElementById("percentage");
  const statusText = document.getElementById("status-text");

  // Remove all color classes
  scoreCircle.classList.remove(
    "safe-color",
    "suspicious-color",
    "scam-color",
    "unknown-color"
  );
  percentageText.classList.remove(
    "safe-color",
    "suspicious-color",
    "scam-color",
    "unknown-color"
  );
  statusText.classList.remove(
    "safe-color",
    "suspicious-color",
    "scam-color",
    "unknown-color"
  );

  // Add the appropriate color class
  scoreCircle.classList.add(`${type}-color`);
  percentageText.classList.add(`${type}-color`);
  statusText.classList.add(`${type}-color`);

  // Set the status text
  statusText.innerText = message;
}
