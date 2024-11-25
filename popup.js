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

function loadOpenTabs() {
    chrome.tabs.query({}, (tabs) => {
        const tabsList = document.getElementById("tabsList");
        tabsList.innerHTML = ""; // Clear the list

        tabs.forEach((tab) => {
            // Ignore tabs with restricted URLs
            if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
                console.warn(`Skipping restricted tab with URL: ${tab.url}`);
                return;
            }

            // Create a list item for each tab
            const listItem = document.createElement("li");
            listItem.className = "list-group-item bg-dark text-light d-flex align-items-center";
            listItem.draggable = true; // Enable dragging
            listItem.dataset.tabId = tab.id; // Save the tab ID for reference

            // Tab favicon (if available)
            const tabImage = document.createElement("img");
            tabImage.src = tab.favIconUrl || "default-icon.png"; // Placeholder if no favicon
            tabImage.alt = "Tab Icon";
            tabImage.className = "tab-icon me-2";
            tabImage.onerror = () => {
                tabImage.src = "default-icon.png"; // Handle broken favicon URLs
            };

            // Tab title
            const tabTitle = document.createElement("span");
            tabTitle.textContent = tab.title || tab.url;

            // Append elements
            listItem.appendChild(tabImage);
            listItem.appendChild(tabTitle);

            // Add drag event listeners
            listItem.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("tabId", tab.id); // Store tab ID for transfer
                console.log(`Started dragging tab ID: ${tab.id}`);
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

        // Right-click context menu
        workflowDiv.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            showContextMenu(e.pageX, e.pageY, workflowName);
        });
        workflowDiv.addEventListener("dragover", (e) => {
            e.preventDefault(); // Allow drop
        });

        workflowDiv.addEventListener("drop", async (e) => {
            e.preventDefault();

            const tabId = parseInt(e.dataTransfer.getData("tabId"), 10); // Get the dragged tab ID
            console.log(`Tab dropped with ID: ${tabId} into workflow "${workflowName}"`);

            if (isNaN(tabId)) {
                console.warn("Invalid tab ID detected during drop event.");
                return;
            }

            // Add the tab to the workflow if not already present
            if (!workflows[workflowName].includes(tabId)) {
                workflows[workflowName].push(tabId); // Add tab to the workflow
                console.log(`Added tab ID ${tabId} to workflow "${workflowName}".`);

                await groupTabsInBrowser(workflowName, workflows[workflowName]); // Group tabs in browser
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

        // Find the group ID for the workflow by checking existing tabs in the workflow
        let groupId = null;
        for (const tabId of validTabIds) {
            const tab = await chrome.tabs.get(tabId);
            if (tab.groupId !== -1) {
                groupId = tab.groupId;
                break; // Reuse the first valid group ID we find
            }
        }

        if (groupId !== null) {
            console.log(`Reusing existing group ID ${groupId} for workflow "${workflowName}"`);
        } else {
            console.log(`Creating a new group for workflow "${workflowName}"`);
        }

        // Group the tabs, either into the existing group or a new one
        groupId = await chrome.tabs.group({
            tabIds: validTabIds,
            ...(groupId !== null && { groupId }), // Reuse the existing group ID if available
        });

        // Update the group name without changing the color
        await chrome.tabGroups.update(groupId, { title: workflowName });
        console.log(`Updated group name to "${workflowName}" for group ID ${groupId}`);
    } catch (error) {
        console.error(`Error grouping tabs for workflow "${workflowName}":`, error.message);
    }
}

async function validateTabIds(tabIds) {
    const validTabIds = [];

    for (const tabId of tabIds) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab?.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
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
// Ungroup tabs in the browser
async function ungroupTabs(tabIds) {
    for (const tabId of tabIds) {
        try {
            await chrome.tabs.ungroup(tabId);
        } catch (error) {
            console.warn(`Error ungrouping tab ID ${tabId}:`, error.message);
        }
    }
}

async function renameWorkflow(oldName, newName) {
    if (workflows[newName]) {
        alert("A workflow with this name already exists!");
        return;
    }

    const tabIds = workflows[oldName];
    workflows[newName] = tabIds;
    delete workflows[oldName];

    await saveWorkflows(); // Save updated workflows

    // Update the group name in the browser while reusing the group ID
    const validTabIds = await validateTabIds(tabIds);
    if (validTabIds.length > 0) {
        // Find the existing group ID
        let groupId = null;
        for (const tabId of validTabIds) {
            const tab = await chrome.tabs.get(tabId);
            if (tab.groupId !== -1) {
                groupId = tab.groupId;
                break;
            }
        }

        if (groupId !== null) {
            console.log(`Reusing existing group ID ${groupId} for renaming workflow to "${newName}"`);
            await chrome.tabGroups.update(groupId, { title: newName });
        }
    }

    updateUI(); // Refresh the UI
}

// Delete the workflow and ungroup all associated tabs
async function deleteWorkflow(workflowName) {
    const tabIds = workflows[workflowName];
    delete workflows[workflowName];
    await saveWorkflows(); // Save updated workflows

    // Ungroup associated tabs
    await ungroupTabs(tabIds);

    updateUI(); // Refresh the UI
}

// Show the context menu for a workflow
function showContextMenu(x, y, workflowName) {
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;

    // Rename option
    const renameOption = document.createElement("div");
    renameOption.className = "context-menu-item";
    renameOption.textContent = "Rename";
    renameOption.addEventListener("click", async () => {
        const newName = prompt("Enter a new name for the workflow:", workflowName);
        if (newName && newName !== workflowName) {
            await renameWorkflow(workflowName, newName);
        }
        document.body.removeChild(menu);
    });

    // Delete option
    const deleteOption = document.createElement("div");
    deleteOption.className = "context-menu-item";
    deleteOption.textContent = "Delete";
    deleteOption.addEventListener("click", async () => {
        if (confirm(`Are you sure you want to delete the workflow "${workflowName}"?`)) {
            await deleteWorkflow(workflowName);
        }
        document.body.removeChild(menu);
    });

    menu.appendChild(renameOption);
    menu.appendChild(deleteOption);
    document.body.appendChild(menu);

    // Remove the menu when clicking outside
    document.addEventListener(
        "click",
        () => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
        },
        { once: true }
    );
}