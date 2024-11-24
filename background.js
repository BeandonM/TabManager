let workflows = {};
let suspendedTabs = new Set();

chrome.storage.local.clear(function () {
    if (chrome.runtime.lastError) {
        console.error("Error clearing storage:", chrome.runtime.lastError);
    } else {
        console.log("Local storage cleared.");
    }
});

// Listen for tab changes and implement workflows
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        updateTabMemoryUsage(tabId);
    }
});

// Automatically suspend inactive tabs
chrome.idle.onStateChanged.addListener((state) => {
    if (state === "idle") {
        chrome.tabs.query({ active: false }, (tabs) => {
            tabs.forEach((tab) => suspendTab(tab.id));
        });
    }
});

function suspendTab(tabId) {
    chrome.tabs.update(tabId, { url: "chrome-extension://<extension_id>/suspended.html" });
    suspendedTabs.add(tabId);
}

function unsuspendTab(tabId) {
    if (suspendedTabs.has(tabId)) {
        suspendedTabs.delete(tabId);
    }
}

function updateTabMemoryUsage(tabId) {
    // Get the tab's URL to check if it is accessible
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
            console.error(`Error retrieving tab ${tabId}:`, chrome.runtime.lastError.message);
            return;
        }

        const tabUrl = tab.url;

        // Check if the URL is restricted
        if (!tabUrl || tabUrl.startsWith("chrome://") || tabUrl.startsWith("edge://")) {
            console.warn(`Cannot access memory usage for restricted URL: ${tabUrl}`);
            return;
        }

        // Execute script if the URL is valid
        chrome.scripting.executeScript(
            { target: { tabId }, func: getMemoryUsage },
            (results) => {
                if (chrome.runtime.lastError) {
                    console.error(`Error executing script on tab ${tabId}:`, chrome.runtime.lastError.message);
                    return;
                }

                if (!results || results.length === 0) {
                    console.error(`No results returned from executeScript for tab ${tabId}`);
                    return;
                }

                const memoryUsage = results[0]?.result;
                if (memoryUsage !== undefined) {
                    console.log(`Tab ${tabId} memory usage: ${memoryUsage}MB`);
                } else {
                    console.error(`Memory usage not found in script results for tab ${tabId}`);
                }
            }
        );
    });
}

function getMemoryUsage() {
    return Math.random() * 100; // Mock memory usage; replace with real data
}