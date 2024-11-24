document.getElementById("export").addEventListener("click", () => {
    chrome.storage.local.get("workflows", (data) => {
        const blob = new Blob([JSON.stringify(data.workflows, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "workflows.json";
        a.click();
        URL.revokeObjectURL(url);
    });
});