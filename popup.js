let workflows = {}; // Store workflows locally

// Load workflows and tabs on popup open
document.addEventListener("DOMContentLoaded", async () => {
    await loadWorkflows(); // Load workflows from storage
    loadOpenTabs(); // Load currently open tabs
    updateUI(); // Update the UI
});

// Add a new workflow
document.getElementById("newWorkflow").addEventListener("click", async () => {
    const workflowName = prompt("Enter workflow name:");
    if (workflowName && !workflows[workflowName]) {
        workflows[workflowName] = [];
        await saveWorkflows(); // Save workflows to storage
        updateUI();
    } else if (workflows[workflowName]) {
        alert("Workflow with this name already exists!");
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

        workflowDiv.addEventListener("drop", async (e) => {
            e.preventDefault();

            const tabId = parseInt(e.dataTransfer.getData("tabId"), 10); // Get the dragged tab ID
            console.log(`Tab dropped with ID: ${tabId}`);

            if (isNaN(tabId)) {
                console.warn("Invalid tab ID detected during drop event.");
                return;
            }

            if (!workflows[workflowName].includes(tabId)) {
                workflows[workflowName].push(tabId); // Add tab to the workflow
                console.log(`Added tab ID ${tabId} to workflow "${workflowName}".`);

                await groupTabsInBrowser(workflowName, workflows[workflowName]); // Group tabs in browser with workflow name
                await saveWorkflows(); // Save workflows to storage
                updateUI(); // Refresh the UI
            } else {
                console.log(`Tab ID ${tabId} is already part of workflow "${workflowName}".`);
            }
        });

        workflowDiv.appendChild(workflowList);
        workflowsDiv.appendChild(workflowDiv);
    }
}

async function groupTabsInBrowser(workflowName, tabIds) {
    console.log(`Attempting to group tabs for workflow "${workflowName}" with tab IDs:`, tabIds);

    try {
        // Validate tab IDs
        const validTabIds = await validateTabIds(tabIds);
        console.log(`Valid Tab IDs for workflow "${workflowName}":`, validTabIds);

        if (validTabIds.length === 0) {
            console.warn(`No valid tabs to group for workflow "${workflowName}".`);
            return;
        }

        // Group the valid tabs and get the group ID
        const groupId = await chrome.tabs.group({ tabIds: validTabIds });

        if (groupId !== undefined) {
            // Explicitly update the group name to match the workflow name
            await chrome.tabGroups.update(groupId, { title: workflowName });
            console.log(`Successfully grouped tabs for workflow "${workflowName}" with groupId: ${groupId}`);
        } else {
            console.error(`Failed to create a group for workflow: ${workflowName}`);
        }
    } catch (error) {
        console.error(`Error grouping tabs for workflow "${workflowName}":`, error.message);
    }
}

async function validateTabIds(tabIds) {
    const validTabIds = [];

    for (const tabId of tabIds) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
                validTabIds.push(tabId);
            } else {
                console.warn(`Tab ID ${tabId} is invalid or restricted (URL: ${tab?.url}).`);
            }
        } catch (error) {
            console.warn(`Error accessing tab ID ${tabId}:`, error.message);
        }
    }

    console.log("Valid Tab IDs:", validTabIds);
    return validTabIds;
}

// Save workflows to storage
async function saveWorkflows() {
    await chrome.storage.local.set({ workflows });
}

// Load workflows from storage
async function loadWorkflows() {
    const result = await chrome.storage.local.get("workflows");
    workflows = result.workflows || {};
}
