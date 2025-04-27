document.addEventListener("DOMContentLoaded", async () => {
  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let url = new URL(tab.url);
    document.getElementById("site-name").innerText = url.hostname;
    document.getElementById("report-btn").addEventListener("click", () => {
      console.log(`Reported site: $(url.hostname)`);
      alert(`Site $(url.hostname) reported!`);
    });
  } catch (error) {
    console.error("Error fetching tab information:", error);
    alert("Failed to fetch tab information. Please try again.");
    document.getElementById("site-name").innerText = "Could not load site";
  }
});
