
window.initializeApp = function() {
    console.log("[APP.JS] initializeApp called.");

    const calculatePeriodBtn = document.getElementById('calculateAllBtn');
    const projNameHeaderInput = document.getElementById('projNameHeaderInput');
    const projectCostInput = document.getElementById('projectCost');
    const projNoInput = document.getElementById('projNo');
    const clientNameInput = document.getElementById('clientName');
    const consultantNameInput = document.getElementById('consultantName');
    const contractTypeInput = document.getElementById('contractType');
    const projScheduledDaysInput = document.getElementById('projScheduledDays');
    const periodStatusDateInput = document.getElementById('globalStatusDate');
    const projectBACInput = document.getElementById('projectBACInput');

    // --- Event Listeners for Project Info Header fields ---
    if (projNameHeaderInput) projNameHeaderInput.addEventListener('change', updateCurrentProjectInfoFromHeader);
    if (projectCostInput) projectCostInput.addEventListener('change', updateCurrentProjectInfoFromHeader);
    if (projNoInput) projNoInput.addEventListener('change', updateCurrentProjectInfoFromHeader);
    if (clientNameInput) clientNameInput.addEventListener('change', updateCurrentProjectInfoFromHeader);
    if (consultantNameInput) consultantNameInput.addEventListener('change', updateCurrentProjectInfoFromHeader);
    if (contractTypeInput) contractTypeInput.addEventListener('change', updateCurrentProjectInfoFromHeader);
    if (projScheduledDaysInput) projScheduledDaysInput.addEventListener('change', updateCurrentProjectInfoFromHeader);
    
    if (periodStatusDateInput) {
        periodStatusDateInput.addEventListener('change', updateCurrentPeriodStatusDateFromHeader);
    }
    if (projectBACInput) projectBACInput.addEventListener('change', updateCurrentProjectInfoFromHeader);

    // --- Main Calculation Button Listener ---
    if (calculatePeriodBtn) {
        calculatePeriodBtn.addEventListener('click', () => {
            console.log(`[APP.JS] 'Calculate Current Period' button clicked for Project ID: ${window.currentProjectId}, Period ID: ${window.currentPeriodId}`);
            
            if (!window.currentProjectId || !window.currentPeriodId) {
                if (window.showToast) window.showToast("Please select a project and a reporting period first.", "warning");
                console.warn("[APP.JS] Calculation aborted: No current project or period ID.");
                window.latestEvmResultsForCurrentPeriod = null; // Ensure it's null
                if (typeof window.updateResultsTab === 'function') window.updateResultsTab(null);
                if (typeof window.updateDashboard === 'function') {
                     const projectForClear = window.allProjectsData ? window.allProjectsData[window.currentProjectId] : null;
                     const periodForClear = projectForClear && window.currentPeriodId ? projectForClear.periods.find(p => p.id === window.currentPeriodId) : null;
                    window.updateDashboard(null, projectForClear, periodForClear);
                }
                return;
            }

            console.log("[APP.JS] Attempting to sync bid items from table for current period.");
            if (!syncCurrentPeriodBidItems_Cumulative()) {
                if (window.showToast) window.showToast("Failed to sync data from table. Calculation aborted.", "error");
                console.error("[APP.JS] syncCurrentPeriodBidItems_Cumulative failed. Aborting calculation.");
                window.latestEvmResultsForCurrentPeriod = null; // Ensure it's null
                // Optionally update tabs to reflect no data
                return;
            }
            console.log("[APP.JS] Bid items synced successfully.");

            console.log("[APP.JS] Collecting data for current period calculation.");
            const currentContextData = collectDataForCurrentPeriodCalculation_Cumulative();

            if (currentContextData) {
                console.log("[APP.JS] Data collected for calculation (current period inputs):", JSON.parse(JSON.stringify(currentContextData)));

                if (typeof window.calculateAllEVM !== 'function') {
                    console.error("[APP.JS] FATAL: window.calculateAllEVM is not defined!");
                    if (window.showToast) window.showToast("Error: Calculation module not loaded.", "error");
                    window.latestEvmResultsForCurrentPeriod = null; // Ensure it's null
                    return;
                }

                console.log("[APP.JS] Calling window.calculateAllEVM...");
                const evmResults = window.calculateAllEVM(
                    currentContextData.currentPeriodBidItems_cumulative,
                    currentContextData.projectInfo,
                    currentContextData.allProjectPeriods_withCumulativeData,
                    currentContextData.currentPeriodObject
                );
                console.log("[APP.JS] EVM Results received from calculateAllEVM:", JSON.parse(JSON.stringify(evmResults || {})));

                if (evmResults && evmResults.periodMetrics && evmResults.cumulativeMetrics) {
                    const project = window.allProjectsData[window.currentProjectId];
                    const periodObj = project.periods.find(p => p.id === window.currentPeriodId);

                    if (periodObj) {
                        periodObj.evmMetrics = evmResults.periodMetrics;
                    }
                    project.cumulativeEvmMetrics = evmResults.cumulativeMetrics;
                    console.log("[APP.JS] Stored EVM metrics into allProjectsData for project:", window.currentProjectId, "period:", window.currentPeriodId);

                    window.latestEvmResultsForCurrentPeriod = evmResults;
                    console.log("[APP.JS] Set window.latestEvmResultsForCurrentPeriod to:", JSON.parse(JSON.stringify(window.latestEvmResultsForCurrentPeriod)));

                    if (typeof window.updateResultsTab === 'function') {
                        console.log("[APP.JS] Directly calling updateResultsTab after successful calculation with FRESH evmResults.");
                        window.updateResultsTab(evmResults);
                    }
                    if (typeof window.updateDashboard === 'function') {
                        console.log("[APP.JS] Directly calling updateDashboard after successful calculation with FRESH evmResults.");
                        const project = window.allProjectsData[window.currentProjectId]; // Get current project
                        const periodObj = project.periods.find(p => p.id === window.currentPeriodId); // Get current period object
                        window.updateDashboard(evmResults, project, periodObj); 
                    }

                    console.log("[APP.JS] Period calculations complete. UI (direct update) potentially updated.");
                    if (window.showToast) window.showToast("Period calculations updated!", "success", 2000);
                    if (typeof saveAllDataToStorage === "function") saveAllDataToStorage(); else console.warn("[APP.JS] saveAllDataToStorage function not found globally.");

                } else {
                    console.error("[APP.JS] EVM calculation returned incomplete or no results. Setting latestEvmResults to null.");
                    if (window.showToast) window.showToast("Error: Failed to calculate complete EVM metrics.", "error");
                    window.latestEvmResultsForCurrentPeriod = null;
                    if (typeof window.updateResultsTab === 'function') window.updateResultsTab(null);
                     const projectForClear = window.allProjectsData ? window.allProjectsData[window.currentProjectId] : null;
                     const periodForClear = projectForClear && window.currentPeriodId ? projectForClear.periods.find(p => p.id === window.currentPeriodId) : null;
                    if (typeof window.updateDashboard === 'function') window.updateDashboard(null, projectForClear, periodForClear);
                }
            } else {
                console.warn("[APP.JS] Could not collect data for current period calculation. Aborted. Setting latestEvmResults to null.");
                if (window.showToast) window.showToast("Could not collect data for calculation. Check selection.", "warning");
                window.latestEvmResultsForCurrentPeriod = null;
                if (typeof window.updateResultsTab === 'function') window.updateResultsTab(null);
                 const projectForClear = window.allProjectsData ? window.allProjectsData[window.currentProjectId] : null;
                 const periodForClear = projectForClear && window.currentPeriodId ? projectForClear.periods.find(p => p.id === window.currentPeriodId) : null;
                if (typeof window.updateDashboard === 'function') window.updateDashboard(null, projectForClear, periodForClear);
            }
        });
    } else {
        console.warn("[APP.JS] 'calculateAllBtn' not found on the page.");
    }
    console.log("[APP.JS] Main App (app.js) Initialized for cumulative data flow.");
};

/**
 * Syncs CUMULATIVE data from the data entry table into the current period's bidItems in allProjectsData.
 * @returns {boolean} True if successful, false otherwise.
 */
function syncCurrentPeriodBidItems_Cumulative() {
    if (!window.currentProjectId || !window.currentPeriodId || !window.allProjectsData || !window.allProjectsData[window.currentProjectId]) {
        console.warn("[APP.JS - SYNC] Cannot sync bid items: No current project or period selected, or project missing.");
        return false;
    }
    const project = window.allProjectsData[window.currentProjectId];
    const periodObj = project.periods.find(p => p.id === window.currentPeriodId);

    if (periodObj && typeof window.getBidItemsData === 'function') {
        const itemsFromTable = window.getBidItemsData();
        periodObj.bidItems = itemsFromTable;
        console.log("[APP.JS - SYNC] Synced bid items from table to allProjectsData. Period object now for period", periodObj.id, ":", JSON.parse(JSON.stringify(periodObj)));
        return true;
    } else if (!periodObj) {
        console.error("[APP.JS - SYNC] Could not find current period object in allProjectsData to sync bid items for period ID:", window.currentPeriodId);
        return false;
    } else {
        console.error("[APP.JS - SYNC] window.getBidItemsData function not found (dataEntry.js).");
        return false;
    }
}

/**
 * Collects data for the CURRENT period, expecting cumulative values from bid items.
 * @returns {object|null}
 */
function collectDataForCurrentPeriodCalculation_Cumulative() {
    if (!window.currentProjectId || !window.allProjectsData || !window.allProjectsData[window.currentProjectId]) {
        console.error("[APP.JS - COLLECT] No current project selected or project data not found.");
        return null;
    }
    const project = window.allProjectsData[window.currentProjectId];

    if (!window.currentPeriodId || !project.periods.find(p => p.id === window.currentPeriodId)) {
        console.error("[APP.JS - COLLECT] No current period selected or period data not found for project:", window.currentProjectId, "and period:", window.currentPeriodId);
        return null;
    }
    const currentPeriodObject = project.periods.find(p => p.id === window.currentPeriodId);

    // currentPeriodObject.bidItems should now contain TO-DATE values for each item,
    // as synced by syncCurrentPeriodBidItems_Cumulative()
    const currentPeriodBidItems_cumulative = currentPeriodObject.bidItems || [];

    console.log("[APP.JS - COLLECT] Collected currentPeriodBidItems_cumulative FOR CALCULATION for period", currentPeriodObject.id, ":", JSON.parse(JSON.stringify(currentPeriodBidItems_cumulative)));

    return {
        projectInfo: { ...project.projectInfo }, // Pass a copy
        currentPeriodBidItems_cumulative: JSON.parse(JSON.stringify(currentPeriodBidItems_cumulative)), // Pass a deep copy
        allProjectPeriods_withCumulativeData: JSON.parse(JSON.stringify(project.periods)), // Pass a deep copy
        currentPeriodObject: JSON.parse(JSON.stringify(currentPeriodObject)) // Pass a deep copy
    };
}

// --- Project Info and Period Status Date Update Functions ---
let projectInfoUpdateDebounceTimerApp;
function updateCurrentProjectInfoFromHeader() {
    clearTimeout(projectInfoUpdateDebounceTimerApp);
    projectInfoUpdateDebounceTimerApp = setTimeout(() => {
        if (!window.currentProjectId || !window.allProjectsData || !window.allProjectsData[window.currentProjectId]) {
            console.warn("[APP.JS - HEADER] Cannot update project info: No current project selected.");
            return;
        }
        const project = window.allProjectsData[window.currentProjectId];
        const projInfo = project.projectInfo;
        let changed = false;
        let triggerRecalculation = false; // Flag to see if BAC change requires recalculation
        let oldProjectName = projInfo.projName;

        // ... (handling for projNo, projName, clientName, etc.) ...
        const newProjNo = document.getElementById('projNo')?.value;
        if (newProjNo !== projInfo.projNo) { projInfo.projNo = newProjNo; changed = true; }
        
        const newProjName = document.getElementById('projNameHeaderInput')?.value;
        if (newProjName !== projInfo.projName) { projInfo.projName = newProjName; changed = true; }
        
        const newClientName = document.getElementById('clientName')?.value;
        if (newClientName !== projInfo.clientName) { projInfo.clientName = newClientName; changed = true; }
        
        const newConsultantName = document.getElementById('consultantName')?.value;
        if (newConsultantName !== projInfo.consultantName) { projInfo.consultantName = newConsultantName; changed = true; }
        
        const newContractType = document.getElementById('contractType')?.value;
        if (newContractType !== projInfo.contractType) { projInfo.contractType = newContractType; changed = true; }
        
        const newProjectCostVal = document.getElementById('projectCost')?.value;
        const newProjectCost = newProjectCostVal === '' ? null : parseFloat(newProjectCostVal);
        if (newProjectCost !== projInfo.projectCost && (!isNaN(newProjectCost) || newProjectCost === null)) { 
            projInfo.projectCost = newProjectCost; 
            changed = true; 
            triggerRecalculation = true; // Contract value change affects margins
        }

        const newScheduledDaysVal = document.getElementById('projScheduledDays')?.value;
        const newScheduledDays = newScheduledDaysVal === '' ? null : parseInt(newScheduledDaysVal);
        if (newScheduledDays !== projInfo.projScheduledDays && (!isNaN(newScheduledDays) || newScheduledDays === null)) { 
            projInfo.projScheduledDays = newScheduledDays; 
            changed = true; 
        }

        // Handle the new BAC input
        const newProjectBACVal = document.getElementById('projectBACInput')?.value;
        // If empty, store null (or 0 if you prefer default BAC to be 0 instead of calculated from items)
        const newProjectBAC = newProjectBACVal === '' ? null : parseFloat(newProjectBACVal); 

        // Check if it's a valid number or null, and if it's different
        if (newProjectBAC !== projInfo.totalBACFromBaseline && (!isNaN(newProjectBAC) || newProjectBAC === null)) {
            projInfo.totalBACFromBaseline = newProjectBAC;
            changed = true;
            triggerRecalculation = true; // BAC change fundamentally affects EVM
            console.log(`[APP.JS - HEADER] User updated Project BAC (totalBACFromBaseline) to: ${projInfo.totalBACFromBaseline}`);
        }


        if (changed) {
            console.log("[APP.JS - HEADER] Updated project info in allProjectsData for:", window.currentProjectId, projInfo);
            document.getElementById('currentProjectNameDisplay').textContent = projInfo.projName || 'N/A';
            if (oldProjectName !== projInfo.projName && typeof window.renderProjectList === 'function') {
                window.renderProjectList();
            }
            if (typeof saveAllDataToStorage === "function") saveAllDataToStorage(); else console.warn("[APP.JS] saveAllDataToStorage function not found globally.");
            if (window.showToast) window.showToast("Project info updated.", "info", 2000);

            if (triggerRecalculation && window.currentPeriodId) { // Only recalculate if a period is active
                console.log("[APP.JS - HEADER] Project BAC or Contract Value changed, triggering recalculation.");
                const calculateBtn = document.getElementById('calculateAllBtn');
                if (calculateBtn) calculateBtn.click();
            }
        }
    }, 750);
}

function updateCurrentPeriodStatusDateFromHeader() {
    if (!window.currentProjectId || !window.currentPeriodId || !window.allProjectsData[window.currentProjectId]) {
        console.warn("[APP.JS - HEADER] Cannot update period status date: Project/Period not selected or data missing.");
        return;
    }
    const project = window.allProjectsData[window.currentProjectId];
    const periodObj = project.periods.find(p => p.id === window.currentPeriodId);

    if (periodObj) {
        const newStatusDate = document.getElementById('globalStatusDate')?.value;
        if (newStatusDate && newStatusDate !== periodObj.statusDate) {
            periodObj.statusDate = newStatusDate;
            console.log(`[APP.JS - HEADER] Updated status date for period ${periodObj.id} to ${newStatusDate}`);
            
            // Re-sort periods by date (descending) as status date change might affect order
            project.periods.sort((a, b) => new Date(b.statusDate) - new Date(a.statusDate));
            
            // Update UI elements that show period info
            if (typeof window.updateProjectInfoHeader === 'function') { // This function is in leftNavPanel.js
                window.updateProjectInfoHeader(project.projectInfo, periodObj);
            }
            if (typeof window.renderProjectList === 'function') { // This function is in leftNavPanel.js
                window.renderProjectList(); // Re-render list as period display name or order might change
            }
            
            // Update current period title spans in tabs
            const periodTitleSpans = document.querySelectorAll('.current-period-title-tab');
            const periodDisplayId = periodObj ? `${periodObj.id} (${new Date(periodObj.statusDate).toLocaleDateString()})` : 'N/A';
            periodTitleSpans.forEach(span => span.textContent = periodDisplayId);

            if (typeof saveAllDataToStorage === "function") saveAllDataToStorage(); else console.warn("[APP.JS] saveAllDataToStorage function not found globally.");
            if (window.showToast) window.showToast("Period status date updated.", "info", 2000);

            // After updating date, it's good practice to re-calculate as PV/EV/AC might be date-dependent in some systems
            // or if baseline interpretation changes. For this app, it re-confirms current data.
            const calculateBtn = document.getElementById('calculateAllBtn');
            if (calculateBtn) calculateBtn.click();
        }
    } else {
        console.warn("[APP.JS - HEADER] Could not find period object for ID:", window.currentPeriodId, "in project:", window.currentProjectId);
    }
}

// Ensure saveAllDataToStorage is globally available if called from other files.
// It's typically defined in leftNavPanel.js like: window.saveAllDataToStorage = function() { ... }