document.getElementById("newWorkflow").addEventListener("click", () => {
    const workflowName = prompt("Enter workflow name:");
    if (workflowName) {
        createWorkflow(workflowName);
    }
});

function createWorkflow(name) {
    workflows[name] = [];
    updateUI();
}

function updateUI() {
    const workflowsDiv = document.getElementById("workflows");
    workflowsDiv.innerHTML = "";
    for (const workflow in workflows) {
        const workflowDiv = document.createElement("div");
        workflowDiv.innerHTML = `<strong>${workflow}</strong>`;
        workflowsDiv.appendChild(workflowDiv);
    }
}