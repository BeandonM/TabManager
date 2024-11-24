let workflows = {}; // Stores workflows with tab IDs

// Initialize the UI
document.addEventListener("DOMContentLoaded", () => {
    loadOpenTabs();
    updateUI();
});

// Add a new workflow
document.getElementById("newWorkflow").addEventListener("click", () => {
    const workflowName = prompt("Enter workflow name:");
    if (workflowName) {
        workflows[workflowName] = [];
        updateUI();
    }
});

// Load open tabs into the list
function loadOpenTabs() {
    chrome.tabs.query({}, (tabs) => {
        const tabsList = document.getElementById("tabsList");
        tabsList.innerHTML = ""; // Clear the list
        tabs.forEach((tab) => {
            const listItem = document.createElement("li");
            listItem.className = "list-group-item bg-dark text-light";
            listItem.draggable = true;
            listItem.textContent = tab.title || tab.url;
            listItem.dataset.tabId = tab.id; // Save the tab ID for reference

            // Add drag event listeners
            listItem.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("tabId", tab.id);
            });

            tabsList.appendChild(listItem);
        });
    });
}

// Update the workflows UI
function updateUI() {
    const workflowsDiv = document.getElementById("workflows");
    workflowsDiv.innerHTML = ""; // Clear existing workflows

    for (const workflowName in workflows) {
        const workflowDiv = document.createElement("div");
        workflowDiv.className = "workflow bg-secondary text-light p-2 mb-2";
        workflowDiv.textContent = workflowName;

        const workflowList = document.createElement("ul");
        workflowList.className = "list-group mt-2";
        workflows[workflowName].forEach((tabId) => {
            const listItem = document.createElement("li");
            listItem.className = "list-group-item bg-dark text-light";
            listItem.textContent = `Tab ID: ${tabId}`;
            workflowList.appendChild(listItem);
        });

        // Allow dropping tabs into workflows
        workflowDiv.addEventListener("dragover", (e) => {
            e.preventDefault(); // Allow drop
        });

        workflowDiv.addEventListener("drop", (e) => {
            e.preventDefault();
            const tabId = e.dataTransfer.getData("tabId"); // Get the dragged tab ID
            if (!workflows[workflowName].includes(tabId)) {
                workflows[workflowName].push(tabId); // Add tab to the workflow
                updateUI(); // Refresh the UI
            }
        });

        workflowDiv.appendChild(workflowList);
        workflowsDiv.appendChild(workflowDiv);
    }
}
