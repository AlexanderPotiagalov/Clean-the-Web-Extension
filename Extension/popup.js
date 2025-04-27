document.addEventListener("DOMContentLoaded", async () => {
  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let url = new URL(tab.url);
    const domain = url.hostname;

    document.getElementById("site-name").innerText = url.hostname;
    const response = await fetch(
      `http://localhost:5000/api/checkSite?domain=${domain}`
    );
    const data = await response.json();

    const statusElement = document.getElementById("site-status");
    if (data.status === "Safe") {
      statusElement.innerText = "✅ Site is Safe";
      statusElement.style.color = "green";
    } else if (data.status === "Suspicious") {
      statusElement.innerText = "⚠️ Site looks Suspicious";
      statusElement.style.color = "orange";
    } else if (data.status === "Scam") {
      statusElement.innerText = "❌ Site is Reported as Scam!";
      statusElement.style.color = "red";
    }

    // 🔥 Report button
    document
      .getElementById("report-btn")
      .addEventListener("click", async () => {
        try {
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
          alert(reportData.message);
        } catch (err) {
          console.error("Error reporting site:", err);
          alert("❌ Failed to report site.");
        }
      });
  } catch (error) {
    console.error("Error loading site info:", error);
    document.getElementById("site-name").innerText = "Unable to load site.";
  }
});
