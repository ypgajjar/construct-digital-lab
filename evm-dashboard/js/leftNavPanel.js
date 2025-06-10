
const LOCAL_STORAGE_KEY_PROJECTS = 'evmProAllProjectsData_v3'; // Ensure this matches if used elsewhere
const LOCAL_STORAGE_KEY_SELECTION = 'evmProCurrentSelection_v3'; // Ensure this matches

window.initializeLeftNavPanel = function() {
    console.log("[LEFT_NAV] initializeLeftNavPanel called.");
    const addNewProjectBtn = document.getElementById('addNewProjectBtn');
    const loadAllProjectsBtn = document.getElementById('loadAllProjectsBtn');
    const saveAllProjectsBtn = document.getElementById('saveAllProjectsBtn');
    const allProjectsFileUploader = document.getElementById('allProjectsFileUploader');
    const exportToExcelBtn = document.getElementById('exportToExcelBtn');
    const importExcelBtn = document.getElementById('importExcelBtn');
    const excelFileUploader = document.getElementById('excelFileUploader');
    const exportToPdfBtn = document.getElementById('exportToPdfBtn');
    const loadSampleDataBtn = document.getElementById('loadSampleDataBtn');
    if (loadSampleDataBtn) {
        loadSampleDataBtn.addEventListener('click', handleLoadSampleData);
    } else {
        console.warn("[LEFT_NAV/INIT] Load Sample Data button not found.");
    }
    
    if (exportToPdfBtn) {
        exportToPdfBtn.addEventListener('click', handleExportToPDF);
    } else {
        console.warn("[LEFT_NAV] Export to PDF button not found.");
    }

    if (importExcelBtn && excelFileUploader) {
        importExcelBtn.addEventListener('click', () => excelFileUploader.click());
        excelFileUploader.addEventListener('change', handleImportExcelFile);
    } else {
        console.warn("[LEFT_NAV] Import Excel button or file uploader not found.");
    }

    if (exportToExcelBtn) {
        exportToExcelBtn.addEventListener('click', handleExportToExcel);
    } else {
        console.warn("[LEFT_NAV] Export to Excel button not found.");
    }

    if (addNewProjectBtn) {
        addNewProjectBtn.addEventListener('click', () => window.handleAddNewProject());
    } else { console.warn("[LEFT_NAV] Add New Project button not found."); }

    if (loadAllProjectsBtn) {
        loadAllProjectsBtn.addEventListener('click', () => {
            if (allProjectsFileUploader) allProjectsFileUploader.click();
            else console.error("[LEFT_NAV] File uploader for Load All not found.");
        });
    } else { console.warn("[LEFT_NAV] Load All Projects button not found."); }

    if (allProjectsFileUploader) {
        allProjectsFileUploader.addEventListener('change', handleLoadAllProjectsFile);
    } else { console.warn("[LEFT_NAV] All Projects File Uploader input not found."); }
    
    if (saveAllProjectsBtn) {
        saveAllProjectsBtn.addEventListener('click', handleSaveAllProjects);
    } else { console.warn("[LEFT_NAV] Save All Projects button not found."); }

    // Initial load of data is typically handled by DOMContentLoaded in index.html,
    // which then calls window.loadAllDataFromStorage defined here.
    console.log("[LEFT_NAV] Left Navigation Panel Initialized.");
};

// --- CORE UI RENDERING AND SELECTION LOGIC ---
window.renderProjectList = function() {
    const container = document.getElementById('projectListContainer');
    if (!container) {
        console.error("[LEFT_NAV] projectListContainer not found!");
        return;
    }
    container.innerHTML = ''; // Clear previous list

    if (!window.allProjectsData || Object.keys(window.allProjectsData).length === 0) {
        container.innerHTML = '<p class="no-projects-message">No projects. Click "+" above to add a new project.</p>';
        return;
    }

    // Sort projects by name for consistent display
    const sortedProjectIds = Object.keys(window.allProjectsData).sort((a, b) => {
        const nameA = (window.allProjectsData[a].projectInfo.projName || 'Unnamed Project').toLowerCase();
        const nameB = (window.allProjectsData[b].projectInfo.projName || 'Unnamed Project').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    sortedProjectIds.forEach(projectId => {
        const project = window.allProjectsData[projectId];
        if (!project || !project.projectInfo) {
            console.warn(`[LEFT_NAV] Project data or projectInfo missing for ID: ${projectId}. Skipping render.`);
            return;
        }

        const projectDiv = document.createElement('div');
        projectDiv.className = 'project-item';
        projectDiv.setAttribute('data-project-id', project.id);
        if (project.id === window.currentProjectId) {
            projectDiv.classList.add('active-project');
        }

        const projectHeader = document.createElement('div');
        projectHeader.className = 'project-header';
        projectHeader.innerHTML = `
            <span class="project-name-display">${project.projectInfo.projName || 'Unnamed Project'}</span>
            <div class="project-actions">
                <button class="add-period-btn icon-btn-small" data-project-id="${project.id}" title="Add Reporting Period for ${project.projectInfo.projName}">+</button>
                <button class="delete-project-btn icon-btn-small" data-project-id="${project.id}" title="Delete Project ${project.projectInfo.projName}">X</button>
            </div>
        `;

        projectHeader.querySelector('.project-name-display').addEventListener('click', (e) => {
            e.stopPropagation();
            selectProjectAndLatestPeriod(project.id);
        });
        projectHeader.querySelector('.add-period-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.handleAddNewPeriod(project.id);
        });
        projectHeader.querySelector('.delete-project-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteProject(project.id);
        });
        projectDiv.appendChild(projectHeader);

        const periodsList = document.createElement('ul');
        periodsList.className = 'reporting-periods-list';
        if (project.periods && project.periods.length > 0) {
            // Sort periods by status date, most recent first
            const sortedPeriods = [...project.periods].sort((a, b) => {
                const dateA = a.statusDate ? new Date(a.statusDate) : new Date(0); // Handle null/undefined dates
                const dateB = b.statusDate ? new Date(b.statusDate) : new Date(0);
                return dateB - dateA;
            });

            sortedPeriods.forEach(period => {
                const periodItem = document.createElement('li');
                periodItem.className = 'period-item';
                periodItem.setAttribute('data-project-id', project.id);
                periodItem.setAttribute('data-period-id', period.id);
                
                let periodName = period.id; // Default to ID
                if (period.statusDate) {
                    try {
                        const periodDate = new Date(period.statusDate);
                        periodName = `${periodDate.toLocaleString('default', { month: 'long', year: 'numeric' })} (${period.id})`;
                    } catch (e) { console.warn(`[LEFT_NAV] Invalid statusDate for period ${period.id}: ${period.statusDate}`); }
                }

                periodItem.innerHTML = `
                    <span class="period-name-text">${periodName}</span> 
                    <button class="delete-period-btn icon-btn-tiny" title="Delete Period ${periodName}">
                        <i class="fas fa-trash-alt"></i> <!-- Font Awesome Bin Icon -->
                    </button>
                `;

                if (project.id === window.currentProjectId && period.id === window.currentPeriodId) {
                    periodItem.classList.add('active-period');
                }
                periodItem.querySelector('span').addEventListener('click', (e) => {
                    e.stopPropagation();
                    handlePeriodSelect(project.id, period.id);
                });
                periodItem.querySelector('.delete-period-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleDeletePeriod(project.id, period.id);
                });
                periodsList.appendChild(periodItem);
            });
        } else {
            const noPeriodsMsg = document.createElement('li');
            noPeriodsMsg.innerHTML = `<small style="padding-left:5px; color:var(--text-secondary);"><em>No periods. Click project's '+' to add.</em></small>`;
            periodsList.appendChild(noPeriodsMsg);
        }
        projectDiv.appendChild(periodsList);
        container.appendChild(projectDiv);
    });
};

function selectProjectAndLatestPeriod(projectId) {
    console.log(`[LEFT_NAV] selectProjectAndLatestPeriod called for projectId: ${projectId}`);
    const project = window.allProjectsData ? window.allProjectsData[projectId] : null;
    if (!project) {
        console.warn(`[LEFT_NAV] Project not found for ID: ${projectId} during selectProjectAndLatestPeriod.`);
        handlePeriodSelect(null, null); // Clear selection
        return;
    }
    if (project.periods && project.periods.length > 0) {
        const latestPeriod = [...project.periods].sort((a,b) => {
            const dateA = a.statusDate ? new Date(a.statusDate) : new Date(0);
            const dateB = b.statusDate ? new Date(b.statusDate) : new Date(0);
            return dateB - dateA;
        })[0];
        handlePeriodSelect(project.id, latestPeriod.id);
    } else {
        console.log(`[LEFT_NAV] Project ${projectId} has no periods. Selecting project only.`);
        handlePeriodSelect(project.id, null); // Select project, but no period
    }
}

function handlePeriodSelect(projectId, periodId) {
    console.log(`[LEFT_NAV] handlePeriodSelect: Project ID: ${projectId}, Period ID: ${periodId}`);

    if (window.currentProjectId === projectId && window.currentPeriodId === periodId) {
        console.log("[LEFT_NAV] Same project and period selected. No change needed, but ensuring calculation is triggered if data might be stale.");
        // If user clicks same item, ensure calculation is run in case underlying data changed by other means
        // or to simply refresh the view.
        const calculateBtn = document.getElementById('calculateAllBtn');
        if (calculateBtn) {
            // Optionally, add a small delay or check if data is truly stale
            // For now, clicking it ensures data is processed.
            // Be mindful if this causes too many calculations.
            console.log("[LEFT_NAV] Re-triggering calculation for currently selected item.");
            calculateBtn.click();
        }
        return; // Already selected
    }
    
    window.currentProjectId = projectId;
    window.currentPeriodId = periodId;
    window.latestEvmResultsForCurrentPeriod = null; // Crucial: Reset results when selection changes

    if (!projectId) { // No project selected (e.g., after deleting all projects)
        console.log("[LEFT_NAV] No project selected. Clearing main content.");
        clearMainContentForNoSelection();
        window.renderProjectList(); // Update list to show no active project
        saveCurrentSelectionToStorage();
        return;
    }

    const project = window.allProjectsData[projectId];
    if (!project) {
        console.error("[LEFT_NAV] Project data not found for selection:", projectId);
        clearMainContentForNoSelection();
        window.currentProjectId = null; window.currentPeriodId = null;
        window.renderProjectList();
        saveCurrentSelectionToStorage();
        return;
    }

    const period = periodId ? project.periods.find(p => p.id === periodId) : null;
    if (periodId && !period) {
        console.warn(`[LEFT_NAV] Period ${periodId} not found in project ${projectId}. Selecting project only.`);
        window.currentPeriodId = null; // Correct the periodId if not found
    }

    console.log(`[LEFT_NAV] Updating UI for Project: ${project.projectInfo.projName}, Period: ${period ? period.id : 'N/A'}`);
    window.renderProjectList(); // Re-render to show active selection
    window.updateProjectInfoHeader(project.projectInfo, period || null); // Pass null if no period
    
    // Populate data entry table with CUMULATIVE data for the selected period (or empty if no period)
    if (typeof window.populateBidItemsTable === 'function') { // Function from dataEntry.js
        window.populateBidItemsTable((period && period.bidItems) ? period.bidItems : []);
    } else { console.error("[LEFT_NAV] populateBidItemsTable function not found."); }

    if (window.currentProjectId && window.currentPeriodId) { // Only calculate if a specific period is validly selected
        console.log("[LEFT_NAV] Valid project and period selected. Triggering calculation via 'Calculate Current Period' button.");
        const calculateBtn = document.getElementById('calculateAllBtn');
        if (calculateBtn) {
            calculateBtn.click(); // This will set window.latestEvmResultsForCurrentPeriod
        } else {
            console.error("[LEFT_NAV] 'calculateAllBtn' not found to trigger calculation.");
        }
    } else {
        console.log("[LEFT_NAV] No specific period selected or period not found. Clearing EVM results.");
        window.latestEvmResultsForCurrentPeriod = null;
        if (typeof window.updateResultsTab === 'function') window.updateResultsTab(null);
        if (typeof window.updateDashboard === 'function') window.updateDashboard(null, project, null);
    }
    saveCurrentSelectionToStorage();
}

window.updateProjectInfoHeader = function(projectInfo, period) {
    // console.log("[LEFT_NAV] updateProjectInfoHeader called with projectInfo:", projectInfo, "period:", period);
    
    // Ensure elements exist before trying to set their properties
    const currentProjectNameDisplayEl = document.getElementById('currentProjectNameDisplay');
    if (currentProjectNameDisplayEl) currentProjectNameDisplayEl.textContent = projectInfo?.projName || 'N/A';

    const projNoEl = document.getElementById('projNo');
    if (projNoEl) projNoEl.value = projectInfo?.projNo || '';

    const projNameHeaderInputEl = document.getElementById('projNameHeaderInput');
    if (projNameHeaderInputEl) projNameHeaderInputEl.value = projectInfo?.projName || '';

    const clientNameEl = document.getElementById('clientName');
    if (clientNameEl) clientNameEl.value = projectInfo?.clientName || '';

    const consultantNameEl = document.getElementById('consultantName');
    if (consultantNameEl) consultantNameEl.value = projectInfo?.consultantName || '';

    const contractTypeEl = document.getElementById('contractType');
    if (contractTypeEl) contractTypeEl.value = projectInfo?.contractType || '';
    
    const projScheduledDaysEl = document.getElementById('projScheduledDays');
    if (projScheduledDaysEl) projScheduledDaysEl.value = projectInfo?.projScheduledDays === null || projectInfo?.projScheduledDays === undefined ? '' : projectInfo.projScheduledDays;

    // The 'projectCost' (direct contract value) and 'projectBACInput' elements were removed from index.html header.
    // So, no need to try and update them here.
    // The actual Total Contract Value and Project BAC (Cost) will be displayed in the "EVM Results" tab,
    // derived from the sum of bid items.

    let periodDisplayId = 'N/A';
    let statusDateValue = projectInfo?.projectStartDate || new Date().toISOString().split('T')[0];

    if (period && period.id) {
        try {
            // Ensure period.statusDate is valid before creating a Date object
            if (period.statusDate && !isNaN(new Date(period.statusDate).getTime())) {
                periodDisplayId = `${period.id} (${new Date(period.statusDate).toLocaleDateString()})`;
                statusDateValue = period.statusDate;
            } else {
                periodDisplayId = `${period.id} (No/Invalid Date)`;
                console.warn(`[LEFT_NAV] Invalid or missing statusDate for period ${period.id}: ${period.statusDate}`);
                // statusDateValue remains as default or projectStartDate
            }
        } catch (e) {
            periodDisplayId = `${period.id} (Date Error)`;
            console.error(`[LEFT_NAV] Error processing statusDate for period ${period.id}:`, e);
        }
    }
    
    const currentPeriodDisplayEl = document.getElementById('currentPeriodDisplay');
    if (currentPeriodDisplayEl) currentPeriodDisplayEl.textContent = periodDisplayId;

    const globalStatusDateEl = document.getElementById('globalStatusDate');
    if (globalStatusDateEl) globalStatusDateEl.value = statusDateValue;

    const periodTitleSpans = document.querySelectorAll('.current-period-title-tab.header-value');
    periodTitleSpans.forEach(span => span.textContent = periodDisplayId);
}

function clearMainContentForNoSelection() {
    console.log("[LEFT_NAV] clearMainContentForNoSelection called.");
    window.updateProjectInfoHeader(null, null); // Pass null for projectInfo and period
    if (typeof window.populateBidItemsTable === 'function') window.populateBidItemsTable([]);
    window.latestEvmResultsForCurrentPeriod = null;
    if (typeof window.updateResultsTab === 'function') window.updateResultsTab(null);
    if (typeof window.updateDashboard === 'function') window.updateDashboard(null, null, null);
    // Clear active tab content if necessary, or let openTab handle it.
}

// --- ACTION HANDLERS (CRUD for Projects/Periods) ---
window.handleAddNewProject = function(isInitialAppLoad = false) {
    const defaultProjName = "Project " + (Object.keys(window.allProjectsData || {}).length + 1);
    const projectName = isInitialAppLoad ? defaultProjName : prompt("Enter new project name:", defaultProjName);
    
    if (!projectName || projectName.trim() === "") {
        if (!isInitialAppLoad && window.showToast) window.showToast("Project name cannot be empty.", "warning");
        return;
    }
    const projectId = "proj_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    const newProject = {
        id: projectId,
        projectInfo: {
            projNo: `P-${Object.keys(window.allProjectsData || {}).length + 1}`,
            projName: projectName.trim(), clientName: "", consultantName: "", contractType: "",
            projectCost: null, projScheduledDays: null,
            projectStartDate: new Date().toISOString().split('T')[0],
            totalBACFromBaseline: null // Initialize user-settable BAC as null (or 0 if preferred)
        },
        periods: [], cumulativeEvmMetrics: null
    };
    if (!window.allProjectsData) window.allProjectsData = {};
    window.allProjectsData[projectId] = newProject;
    console.log(`[LEFT_NAV] Project "${newProject.projectInfo.projName}" (ID: ${projectId}) created.`);

    if (isInitialAppLoad && Object.keys(window.allProjectsData).length === 1) {
        window.handleAddNewPeriod(projectId, true);
    } else {
        window.renderProjectList();
        handlePeriodSelect(projectId, null);
    }
    if(window.showToast) window.showToast(`Project "${newProject.projectInfo.projName}" created.`, "success");
    window.saveAllDataToStorage();
};

window.handleAddNewPeriod = function(projectId, isPartOfProjectSetup = false) {
    const project = window.allProjectsData[projectId];
    if (!project) {
        if(window.showToast) window.showToast("Error: Project not found to add period.", "error");
        console.error(`[LEFT_NAV] Project with ID ${projectId} not found for adding new period.`);
        return;
    }

    const today = new Date();
    // Suggest next month for new period ID and status date
    const lastPeriodDate = project.periods.length > 0 ? 
        new Date(project.periods.sort((a,b) => new Date(b.statusDate) - new Date(a.statusDate))[0].statusDate) : 
        new Date(project.projectInfo.projectStartDate || today);
    
    const nextMonthDate = new Date(lastPeriodDate.getFullYear(), lastPeriodDate.getMonth() + 1, 1); // First day of next month
    const suggestedYear = nextMonthDate.getFullYear();
    const suggestedMonth = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    
    let defaultPeriodIdSuffix = 1;
    let defaultPeriodId = `${suggestedYear}-${suggestedMonth}`;
    
    while (project.periods.find(p => p.id === defaultPeriodId)) {
        defaultPeriodId = `${suggestedYear}-${suggestedMonth}-v${defaultPeriodIdSuffix++}`;
    }

    // Suggest last day of the suggested month for status date
    const lastDayOfSuggestedMonth = new Date(suggestedYear, nextMonthDate.getMonth() + 1, 0);
    const defaultStatusDate = lastDayOfSuggestedMonth.toISOString().split('T')[0];

    const periodIdInput = isPartOfProjectSetup ? defaultPeriodId : prompt(`Enter reporting period ID for "${project.projectInfo.projName}" (e.g., YYYY-MM):`, defaultPeriodId);
    if (!periodIdInput || periodIdInput.trim() === "") {
        if(!isPartOfProjectSetup && window.showToast) window.showToast("Period ID cannot be empty.", "warning");
        return;
    }
    const periodId = periodIdInput.trim();

    if (project.periods.find(p => p.id === periodId)) {
        if(window.showToast) window.showToast(`Period ID "${periodId}" already exists for this project.`, "warning");
        return;
    }

    const statusDateInput = isPartOfProjectSetup ? defaultStatusDate : prompt(`Enter status date for this period (YYYY-MM-DD):`, defaultStatusDate);
    if (!statusDateInput || isNaN(new Date(statusDateInput).getTime())) {
        if(window.showToast) window.showToast("Valid status date (YYYY-MM-DD) is required.", "error");
        return;
    }

    let newBidItems = [];
    // Find the most recent previous period to copy items from
    if (project.periods.length > 0) {
        const sortedPeriods = [...project.periods].sort((a, b) => new Date(b.statusDate) - new Date(a.statusDate));
        const lastPeriod = sortedPeriods[0]; // Most recent period

        if (lastPeriod && lastPeriod.bidItems && lastPeriod.bidItems.length > 0) {
            console.log(`[LEFT_NAV] Copying items from previous period '${lastPeriod.id}' to new period '${periodId}'.`);
            newBidItems = lastPeriod.bidItems.map(prevItem => {
                // These are the fields that define the item itself and its pricing/costing structure
                const copiedItem = {
                    itemNumber: prevItem.itemNumber,
                    description: prevItem.description,
                    unit: prevItem.unit,
                    totalContractQty: prevItem.totalContractQty,
                    unitCost: prevItem.unitCost,
                    unitContractPrice: prevItem.unitContractPrice,

                    // Derived total values will be recalculated by dataEntry.js, but good to have placeholders
                    totalCostBudget_item: prevItem.totalContractQty * prevItem.unitCost,
                    totalContractPrice_item: prevItem.totalContractQty * prevItem.unitContractPrice,
                    plannedProfit_item: (prevItem.totalContractQty * prevItem.unitContractPrice) - (prevItem.totalContractQty * prevItem.unitCost),

                    // Period-specific values for the NEW period - these need user input or default to 0
                    plannedQty_period: 0, // User must define plan for this new period
                    plannedValue_period_cost: 0, // Will be 0 initially (0 planned qty * unitCost)

                    // Cumulative values: Carry forward from the end of the PREVIOUS period
                    unitsCompleted_toDate: prevItem.unitsCompleted_toDate, 
                    actualCost_toDate: prevItem.actualCost_toDate,

                    // These will be re-calculated by dataEntry based on unitsCompleted_toDate & totalContractQty
                    percentComplete_toDate: 0, // Placeholder, will be recalculated
                    earnedValue_toDate_cost: 0  // Placeholder, will be recalculated
                };
                // Recalculate percentComplete and EV for the copied item based on carried-forward unitsCompleted
                if (copiedItem.totalContractQty > 0) {
                    copiedItem.percentComplete_toDate = (copiedItem.unitsCompleted_toDate / copiedItem.totalContractQty) * 100;
                } else if (copiedItem.unitsCompleted_toDate > 0) {
                    copiedItem.percentComplete_toDate = 100;
                }
                copiedItem.earnedValue_toDate_cost = copiedItem.totalCostBudget_item * (copiedItem.percentComplete_toDate / 100);
                
                return copiedItem;
            });
        }
    }


    const newPeriod = {
        id: periodId,
        statusDate: statusDateInput,
        bidItems: newBidItems, // Assign copied items (or empty array if no previous period/items)
        evmMetrics: null
    };
    project.periods.push(newPeriod);
    project.periods.sort((a, b) => new Date(b.statusDate) - new Date(a.statusDate));
    console.log(`[LEFT_NAV] Period "${periodId}" added to project ${projectId} with ${newBidItems.length} items copied.`);

    window.renderProjectList();
    handlePeriodSelect(projectId, periodId); // Select the new period
    
    if(window.showToast) window.showToast(`Period "${periodId}" added. ${newBidItems.length > 0 ? newBidItems.length + ' items copied.' : ''}`, "success");

    // No need to add a default empty row if items were copied.
    // If no items were copied and it's not part of project setup, then maybe add one.
    if (newBidItems.length === 0 && !isPartOfProjectSetup && typeof window.addBidItemRow === 'function') {
        // Add a default (empty) bid item row for the new period so user can start typing
        if (typeof window.addBidItemRow === 'function') {
            setTimeout(() => {
                const dataEntryTab = document.getElementById('dataEntryTab');
                if (dataEntryTab && dataEntryTab.classList.contains('active-content')) {
                     window.addBidItemRow(null, true); 
                }
            }, 100); 
        }
    }
    window.saveAllDataToStorage();
};

// js/leftNavPanel.js

// ... (existing code at the top) ...

function handleExportToExcel() {
    console.log("[LEFT_NAV] handleExportToExcel called.");
    if (!window.currentProjectId || !window.currentPeriodId) {
        if (window.showToast) window.showToast("Please select a project and period to export.", "warning");
        return;
    }

    const project = window.allProjectsData[window.currentProjectId];
    const period = project.periods.find(p => p.id === window.currentPeriodId);

    if (!project || !period) {
        if (window.showToast) window.showToast("Project or period data not found.", "error");
        return;
    }

    // --- 1. Prepare Data for Bid Items Sheet ---
    const bidItemsHeader = [
        "Item No.", "Description", "Unit", "Total Contract Qty", "Unit Cost", "Unit Contract Price",
        "Total Cost Budget (Item)", "Total Contract Price (Item)", "Planned Profit (Item)",
        "Planned Qty (Period)", "PV (Cost - Period)", "Units Done (To Date)", 
        "% Comp (To Date)", "EV (Cost - To Date)", "AC (To Date)"
    ];
    const bidItemsDataRows = (period.bidItems || []).map(item => [
        item.itemNumber, item.description, item.unit,
        item.totalContractQty, item.unitCost, item.unitContractPrice,
        item.totalCostBudget_item, item.totalContractPrice_item, item.plannedProfit_item,
        item.plannedQty_period, item.plannedValue_period_cost,
        item.unitsCompleted_toDate, 
        item.percentComplete_toDate !== null && isFinite(item.percentComplete_toDate) ? item.percentComplete_toDate.toFixed(2) + "%" : "N/A",
        item.earnedValue_toDate_cost, item.actualCost_toDate
    ]);
    // We will create the sheet and then style the header row directly on the sheet object.
    // So, bidItemsDataForExport will just be the rows for now.
    const bidItemsSheetData = [bidItemsHeader, ...bidItemsDataRows];


    // --- 2. Prepare Data for Summary Sheet ---
    const summarySheetData = []; // This will be an array of arrays, where some cells are objects {v, s, t}
    const boldStyle = { font: { bold: true } }; // Simple bold style

    // Helper to create a styled cell object
    const createStyledCell = (value, style) => ({ v: value, s: style, t: 's' }); // t:'s' for string type

    // Add rows using a mix of plain values and styled cell objects
    summarySheetData.push([createStyledCell("Project Information", boldStyle)]);
    summarySheetData.push(["Project Name:", project.projectInfo.projName]);
    summarySheetData.push(["Project Number:", project.projectInfo.projNo || "N/A"]);
    summarySheetData.push(["Reporting Period:", period.id]);
    summarySheetData.push(["Status Date:", new Date(period.statusDate).toLocaleDateString()]);
    summarySheetData.push([]); 

    if (window.latestEvmResultsForCurrentPeriod) {
        const periodMetrics = window.latestEvmResultsForCurrentPeriod.periodMetrics;
        const cumulativeMetrics = window.latestEvmResultsForCurrentPeriod.cumulativeMetrics;

        summarySheetData.push([createStyledCell("Period Performance (Cost-Based)", boldStyle)]);
        summarySheetData.push([createStyledCell("Metric", boldStyle), createStyledCell("Value", boldStyle)]);
        summarySheetData.push(["PV (Period - Cost)", periodMetrics.PV_Cost]);
        summarySheetData.push(["EV (Period - Cost)", periodMetrics.EV_Cost]);
        summarySheetData.push(["AC (Period)", periodMetrics.AC_Cost]);
        summarySheetData.push(["SV (Period - Cost)", periodMetrics.SV_Cost]);
        summarySheetData.push(["CV (Period - Cost)", periodMetrics.CV_Cost]);
        summarySheetData.push(["SPI (Period - Cost)", periodMetrics.SPI_Cost !== null && isFinite(periodMetrics.SPI_Cost) ? periodMetrics.SPI_Cost.toFixed(2) : "N/A"]);
        summarySheetData.push(["CPI (Period - Cost)", periodMetrics.CPI_Cost !== null && isFinite(periodMetrics.CPI_Cost) ? periodMetrics.CPI_Cost.toFixed(2) : "N/A"]);
        summarySheetData.push([]);

        summarySheetData.push([createStyledCell("Project Cumulative & Forecast (Cost-Based)", boldStyle)]);
        summarySheetData.push([createStyledCell("Metric", boldStyle), createStyledCell("Value", boldStyle)]);
        summarySheetData.push(["Project BAC (Cost)", cumulativeMetrics.projectBAC_Cost]);
        summarySheetData.push(["Total Contract Value", cumulativeMetrics.totalContractValue]);
        summarySheetData.push(["EV (To Date - Cost)", cumulativeMetrics.EV_toDate_Cost]);
        summarySheetData.push(["AC (To Date)", cumulativeMetrics.AC_toDate]);
        summarySheetData.push(["% Complete (Project)", cumulativeMetrics.projectPercentComplete_toDate !== null && isFinite(cumulativeMetrics.projectPercentComplete_toDate) ? cumulativeMetrics.projectPercentComplete_toDate.toFixed(1) + "%" : "N/A"]);
        summarySheetData.push(["EAC (Cost - Basic)", cumulativeMetrics.EAC_Cost_basic]);
        summarySheetData.push(["VAC (Cost)", cumulativeMetrics.VAC_Cost_basic]);
        summarySheetData.push([]);

        summarySheetData.push([createStyledCell("Project Margin Analysis", boldStyle)]);
        summarySheetData.push([createStyledCell("Metric", boldStyle), createStyledCell("Value", boldStyle), createStyledCell("%", boldStyle)]);
        summarySheetData.push(["Total Planned Profit", cumulativeMetrics.totalPlannedProfit, cumulativeMetrics.totalPlannedProfitPercent !== null && isFinite(cumulativeMetrics.totalPlannedProfitPercent) ? cumulativeMetrics.totalPlannedProfitPercent.toFixed(1) + "%" : "N/A"]);
        summarySheetData.push(["Est. Profit at Completion", cumulativeMetrics.estProfitAtCompletion, cumulativeMetrics.estProfitAtCompletionPercent !== null && isFinite(cumulativeMetrics.estProfitAtCompletionPercent) ? cumulativeMetrics.estProfitAtCompletionPercent.toFixed(1) + "%" : "N/A"]);
    } else {
        summarySheetData.push(["EVM Results not available for this period."]);
    }

    // --- 3. Create Workbook and Sheets ---
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet: Pass `cellStyles: true`
    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData, { cellStyles: true }); 
    wsSummary['!cols'] = [ {wch:30}, {wch:20}, {wch:12} ]; // Adjusted widths slightly
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Bid Items Sheet: Create sheet first, then style header
    const wsBidItems = XLSX.utils.aoa_to_sheet(bidItemsSheetData); // Create without cellStyles first
    // Apply bold style to the header row (row 0) of wsBidItems MANUALLY
    if (wsBidItems['!ref']) { // Check if sheet has data (a range string like "A1:C5")
        const range = XLSX.utils.decode_range(wsBidItems['!ref']);
        const firstRow = range.s.r; // Should be 0 for the header

        for (let C = range.s.c; C <= range.e.c; ++C) { // Iterate columns in the first row
            const cellAddress = XLSX.utils.encode_cell({r: firstRow, c: C}); 
            let cell = wsBidItems[cellAddress];
            if (!cell) cell = wsBidItems[cellAddress] = { t:'s', v: bidItemsHeader[C] }; // Create cell if it doesn't exist, ensure type 's'
            if (!cell.s) cell.s = {};       // Ensure style object
            cell.s.font = { bold: true };   // Apply bold font style
            if (!cell.t) cell.t = 's';      // Ensure type is string for headers
        }
    }

    const colsWidthsBidItems = bidItemsHeader.map((headerText, i) => {
        let maxLen = String(headerText || "").length; // Ensure headerText is a string
        bidItemsDataRows.forEach(row => {
            const cellContent = row[i] ? String(row[i]) : "";
            if (cellContent.length > maxLen) maxLen = cellContent.length;
        });
        return { wch: Math.max(12, Math.min(maxLen + 2, 50)) }; // Min 12 for readability
    });
    wsBidItems['!cols'] = colsWidthsBidItems;
    XLSX.utils.book_append_sheet(wb, wsBidItems, "Bid Items Data");

    // --- 4. Generate and Download Excel File ---
    const safeProjectName = (project.projectInfo.projName || "Export").replace(/[^a-z0-9_.]/gi, '_').toLowerCase(); // Allow underscore and dot
    const fileName = `EVM_Export_${safeProjectName}_${period.id}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    if (window.showToast) window.showToast("Data exported to Excel successfully!", "success");
}

function handleImportExcelFile(event) {
    console.log("[LEFT_NAV] handleImportExcelFile triggered.");
    if (!window.currentProjectId || !window.currentPeriodId) {
        if (window.showToast) window.showToast("Please select a project and period first to import data into.", "warning");
        event.target.value = null; // Reset file input
        return;
    }

    const file = event.target.files[0];
    if (!file) {
        console.log("[LEFT_NAV] No Excel file selected for import.");
        event.target.value = null; // Reset file input
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' }); // Or 'array' if reading as ArrayBuffer

            // --- Assume data is in the first sheet or a sheet named "Bid Items Data" ---
            let sheetName = workbook.SheetNames[0];
            if (workbook.SheetNames.includes("Bid Items Data")) {
                sheetName = "Bid Items Data";
            }
            console.log(`[LEFT_NAV] Reading data from Excel sheet: "${sheetName}"`);
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
                throw new Error(`Sheet "${sheetName}" not found in the Excel file.`);
            }

            // Convert sheet to JSON. header: 1 means first row is header.
            // Use raw: false to get formatted strings (e.g., for dates if Excel has them as dates)
            // defval: '' to ensure empty cells become empty strings rather than undefined
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });

            if (jsonData.length < 2) { // Needs at least header row + 1 data row
                throw new Error("Excel sheet has no data rows or is missing headers.");
            }

            // --- Map Excel Data to BidItem Structure ---
            // Assuming the Excel file was generated by our "Export Excel" function,
            // the header row (jsonData[0]) should match our expected columns.
            const headerRow = jsonData[0].map(h => String(h).trim()); // Trim header names
            const expectedHeaders = [ // Must match the order from exportExcelBtn!
                "Item No.", "Description", "Unit", 
                "Total Contract Qty", "Unit Cost", "Unit Contract Price",
                // We don't strictly need to import calculated fields if we recalculate,
                // but if they are present, we can use them or validate.
                // For now, let's focus on importing the primary input fields.
                // "Total Cost Budget (Item)", "Total Contract Price (Item)", "Planned Profit (Item)",
                "Planned Qty (Period)", 
                // "PV (Cost - Period)", // Calculated
                "Units Done (To Date)", 
                // "% Comp (To Date)", "EV (Cost - To Date)", // Calculated
                "AC (To Date)"
            ];
            
            // Find indices of key columns we need to import
            const colIndices = {};
            expectedHeaders.forEach(expectedHeader => {
                const index = headerRow.indexOf(expectedHeader);
                if (index !== -1) {
                    colIndices[expectedHeader] = index;
                } else {
                    // Allow some optional fields, but core ones should be present
                    const coreInputs = ["Item No.", "Total Contract Qty", "Unit Cost", "Unit Contract Price"];
                    if (coreInputs.includes(expectedHeader)) {
                        throw new Error(`Mandatory header "${expectedHeader}" not found in Excel sheet. Please use the exported Excel file as a template.`);
                    }
                    console.warn(`[LEFT_NAV] Optional header "${expectedHeader}" not found in Excel. It will be defaulted.`);
                }
            });


            const importedBidItems = [];
            for (let i = 1; i < jsonData.length; i++) { // Start from row 1 (skip header)
                const row = jsonData[i];
                if (row.every(cell => String(cell).trim() === "")) continue; // Skip empty rows

                const item = {
                    itemNumber: String(row[colIndices["Item No."]] || "").trim(),
                    description: String(row[colIndices["Description"]] || "").trim(),
                    unit: String(row[colIndices["Unit"]] || "").trim(),
                    totalContractQty: parseFloat(row[colIndices["Total Contract Qty"]] || 0),
                    unitCost: parseFloat(row[colIndices["Unit Cost"]] || 0),
                    unitContractPrice: parseFloat(row[colIndices["Unit Contract Price"]] || 0),
                    plannedQty_period: parseFloat(row[colIndices["Planned Qty (Period)"]] || 0),
                    unitsCompleted_toDate: parseFloat(row[colIndices["Units Done (To Date)"]] || 0),
                    actualCost_toDate: parseFloat(row[colIndices["AC (To Date)"]] || 0),
                };

                // Basic validation: if Item No. is missing, skip (or handle as error)
                if (!item.itemNumber) {
                    console.warn("[LEFT_NAV] Skipping row in Excel due to missing Item No.:", row);
                    continue;
                }
                
                // Recalculate derived fields based on imported inputs (important for data integrity)
                item.totalCostBudget_item = item.totalContractQty * item.unitCost;
                item.totalContractPrice_item = item.totalContractQty * item.unitContractPrice;
                item.plannedProfit_item = item.totalContractPrice_item - item.totalCostBudget_item;
                item.plannedValue_period_cost = item.plannedQty_period * item.unitCost;
                
                let percentComplete = 0;
                if (item.totalContractQty > 0) {
                    percentComplete = (item.unitsCompleted_toDate / item.totalContractQty) * 100;
                } else if (item.unitsCompleted_toDate > 0) {
                    percentComplete = 100;
                }
                item.percentComplete_toDate = percentComplete;
                item.earnedValue_toDate_cost = item.totalCostBudget_item * (percentComplete / 100);

                importedBidItems.push(item);
            }

            if (importedBidItems.length === 0) {
                throw new Error("No valid bid items found in the Excel sheet after processing.");
            }

            // --- Integrate into current project/period ---
            // For now, replace all existing bid items for the current period
            const project = window.allProjectsData[window.currentProjectId];
            const period = project.periods.find(p => p.id === window.currentPeriodId);
            
            period.bidItems = importedBidItems;
            console.log(`[LEFT_NAV] Imported ${importedBidItems.length} bid items into period ${period.id} for project ${project.id}.`);

            // --- Update UI and Save ---
            if (typeof window.populateBidItemsTable === 'function') {
                window.populateBidItemsTable(period.bidItems);
            }
            if (typeof window.saveAllDataToStorage === 'function') {
                window.saveAllDataToStorage();
            }
            // Trigger a full recalculation
            const calculateBtn = document.getElementById('calculateAllBtn');
            if (calculateBtn) calculateBtn.click();

            if (window.showToast) window.showToast("Bid items imported from Excel successfully!", "success");

        } catch (error) {
            console.error("[LEFT_NAV] Error importing Excel file:", error);
            if (window.showToast) window.showToast(`Excel Import Error: ${error.message}`, "error", 7000);
        } finally {
            event.target.value = null; // Reset file input in all cases
        }
    };
    reader.onerror = function (error) {
        console.error("[LEFT_NAV] FileReader error:", error);
        if(window.showToast) window.showToast("Error reading the selected file.", "error");
        event.target.value = null;
    };
    reader.readAsBinaryString(file); // Or readAsArrayBuffer if type: 'array' is preferred
}

function handleLoadSampleData() {
    console.log("[DATA_SAMPLE] Loading sample construction project data.");
    if (typeof window.showConfirmationModal === 'function') {
        window.showConfirmationModal(
            "Loading sample data will replace any unsaved current project data. Are you sure you want to proceed?",
            "Confirm Load Sample Data",
            () => {
                loadSampleProjectIntoApplication();
                if (window.showToast) window.showToast("Sample project data loaded!", "success");
            }
        );
    } else { // Fallback if modal isn't available
        if (confirm("Loading sample data will replace any unsaved current project data. Proceed?")) {
            loadSampleProjectIntoApplication();
            if (window.showToast) window.showToast("Sample project data loaded!", "success");
        }
    }
}

function loadSampleProjectIntoApplication() {
    // The sampleConstructionProject data will be defined below or in a separate file
    window.allProjectsData = { ...sampleConstructionProject }; // Replace current data

    // Save to localStorage so it persists if user reloads (optional, or clear other projects)
    if (typeof window.saveAllDataToStorage === 'function') {
        window.saveAllDataToStorage();
    }

    // Re-initialize the view with the new data
    if (typeof window.loadAllDataFromStorage === 'function') {
        // This function usually handles rendering the project list and selecting the first/stored project
        window.loadAllDataFromStorage(); 
    } else if (typeof window.renderProjectList === 'function' && typeof selectProjectAndLatestPeriod === 'function') {
        // Fallback if loadAllDataFromStorage is not comprehensive enough
        window.renderProjectList();
        const firstProjectId = Object.keys(window.allProjectsData)[0];
        if (firstProjectId) {
            selectProjectAndLatestPeriod(firstProjectId);
        }
    }
     // Ensure the UI (especially data entry table and EVM results for the newly selected project/period) refreshes
    const calculateBtn = document.getElementById('calculateAllBtn');
    if (calculateBtn && window.currentProjectId && window.currentPeriodId) {
        setTimeout(() => calculateBtn.click(), 100); // Slight delay for UI to settle
    }
}
// ... (rest of leftNavPanel.js) ...

function handleDeleteProject(projectId) {
    const project = window.allProjectsData[projectId];
    if (!project) return;
    window.showConfirmationModal(
        `DELETE Project: "${project.projectInfo.projName}" and all its data? This action cannot be undone.`,
        "Confirm Project Deletion",
        () => {
            delete window.allProjectsData[projectId];
            console.log(`[LEFT_NAV] Project "${project.projectInfo.projName}" (ID: ${projectId}) deleted.`);
            if (window.currentProjectId === projectId) {
                window.currentProjectId = null;
                window.currentPeriodId = null;
                // Select first available project or clear content
                const remainingProjectIds = Object.keys(window.allProjectsData);
                if (remainingProjectIds.length > 0) {
                    selectProjectAndLatestPeriod(remainingProjectIds[0]);
                } else {
                    clearMainContentForNoSelection();
                }
            }
            window.renderProjectList(); // Always re-render list
            if(window.showToast) window.showToast(`Project "${project.projectInfo.projName}" deleted.`, "info");
            window.saveAllDataToStorage();
            if (Object.keys(window.allProjectsData).length === 0) {
                const container = document.getElementById('projectListContainer');
                if (container) container.innerHTML = '<p class="no-projects-message">No projects. Click "+" to add.</p>';
            }
        }
    );
}

function handleDeletePeriod(projectId, periodId) {
    const project = window.allProjectsData[projectId];
    if (!project) return;
    const periodIndex = project.periods.findIndex(p => p.id === periodId);
    if (periodIndex === -1) return;

    window.showConfirmationModal(
        `DELETE Period: "${periodId}" from project "${project.projectInfo.projName}"? This cannot be undone.`,
        "Confirm Period Deletion",
        () => {
            project.periods.splice(periodIndex, 1);
            console.log(`[LEFT_NAV] Period "${periodId}" deleted from project ${projectId}.`);
            if (window.currentProjectId === projectId && window.currentPeriodId === periodId) {
                window.currentPeriodId = null; // Clear current period
                // Select the latest remaining period for this project, or just the project if no periods left
                selectProjectAndLatestPeriod(projectId); 
            } else {
                 window.renderProjectList(); // Just re-render if the deleted period wasn't active
            }
            if(window.showToast) window.showToast(`Period "${periodId}" deleted.`, "info");
            window.saveAllDataToStorage();
        }
    );
}

// --- DATA PERSISTENCE (localStorage and File) ---
window.saveAllDataToStorage = function() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTS, JSON.stringify(window.allProjectsData));
        // console.log("[LEFT_NAV] All project data saved to localStorage.");
    } catch (e) {
        console.error("[LEFT_NAV] Error saving project data to localStorage:", e);
        if(window.showToast) window.showToast("Error saving data to local storage. Data might be too large.", "error", 7000);
    }
};

function saveCurrentSelectionToStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SELECTION, JSON.stringify({
            currentProjectId: window.currentProjectId,
            currentPeriodId: window.currentPeriodId
        }));
    } catch (e) { console.error("[LEFT_NAV] Error saving selection to localStorage:", e); }
}

window.loadAllDataFromStorage = function() {
    console.log("[LEFT_NAV] loadAllDataFromStorage called.");
    const dataString = localStorage.getItem(LOCAL_STORAGE_KEY_PROJECTS);
    let loadedProjectsSuccessfully = false;
    if (dataString) {
        try {
            const parsedData = JSON.parse(dataString);
            if (typeof parsedData === 'object' && parsedData !== null) {
                window.allProjectsData = parsedData;
                loadedProjectsSuccessfully = true;
                console.log("[LEFT_NAV] Data loaded from localStorage. Project count:", Object.keys(window.allProjectsData).length);
            } else { throw new Error("Invalid data structure in localStorage."); }
        } catch (e) {
            console.error("[LEFT_NAV] Error parsing localStorage data:", e);
            window.allProjectsData = {};
            if(window.showToast) window.showToast("Could not load saved data. Starting fresh.", "warning", 5000);
        }
    } else {
        console.log("[LEFT_NAV] No project data found in localStorage.");
        window.allProjectsData = {};
    }

    // Render project list with loaded or empty data
    window.renderProjectList();

    const selectionString = localStorage.getItem(LOCAL_STORAGE_KEY_SELECTION);
    let storedProjectId = null, storedPeriodId = null;
    if (selectionString) {
        try {
            const sel = JSON.parse(selectionString);
            storedProjectId = sel.currentProjectId;
            storedPeriodId = sel.currentPeriodId;
            console.log(`[LEFT_NAV] Loaded selection from localStorage: Project ${storedProjectId}, Period ${storedPeriodId}`);
        } catch (e) { console.warn("[LEFT_NAV] Could not parse stored selection.", e); }
    }

    if (storedProjectId && window.allProjectsData[storedProjectId]) {
        const project = window.allProjectsData[storedProjectId];
        const periodExists = storedPeriodId && project.periods.find(p => p.id === storedPeriodId);
        if (periodExists) {
            console.log(`[LEFT_NAV] Restoring selection: Project ${storedProjectId}, Period ${storedPeriodId}`);
            handlePeriodSelect(storedProjectId, storedPeriodId);
        } else {
            console.log(`[LEFT_NAV] Restoring selection: Project ${storedProjectId}, latest period (or project only).`);
            selectProjectAndLatestPeriod(storedProjectId);
        }
    } else if (Object.keys(window.allProjectsData).length > 0) {
        const firstProjectId = Object.keys(window.allProjectsData).sort((a,b) => (window.allProjectsData[a].projectInfo.projName || '').localeCompare(window.allProjectsData[b].projectInfo.projName))[0];
        console.log(`[LEFT_NAV] No stored selection or invalid project. Selecting first available project: ${firstProjectId}`);
        selectProjectAndLatestPeriod(firstProjectId);
    } else {
        console.log("[LEFT_NAV] No projects loaded and no selection to restore. Clearing main content.");
        clearMainContentForNoSelection();
        // The logic to add a default project if none exist after load is typically in index.html's DOMContentLoaded
        // based on whether loadAllDataFromStorage resulted in projects.
        // If !loadedProjectsSuccessfully AND Object.keys(window.allProjectsData).length === 0, then index.html can call handleAddNewProject(true)
    }
};

function handleSaveAllProjects() {
    console.log("[LEFT_NAV] handleSaveAllProjects called.");
    // Sync current period data one last time before saving file
    if (window.currentProjectId && window.currentPeriodId && typeof window.syncCurrentPeriodBidItems_Cumulative === 'function') {
        console.log("[LEFT_NAV] Syncing current period bid items before saving all projects to file.");
        window.syncCurrentPeriodBidItems_Cumulative(); // This is the function from app.js
        
        // Also ensure latest calculated metrics are on the objects if a calc just happened
        // This should be handled by the regular calculation flow which updates allProjectsData
        // and window.latestEvmResultsForCurrentPeriod.
        // The saveAllDataToStorage call would have persisted these.
    }

    if (Object.keys(window.allProjectsData).length === 0) {
        if(window.showToast) window.showToast("No project data to save.", "info");
        return;
    }
    try {
        const dataStr = JSON.stringify(window.allProjectsData, null, 2); // Pretty print JSON
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `EVM_AllProjectsData_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement); // Required for Firefox
        linkElement.click();
        document.body.removeChild(linkElement);
        
        if(window.showToast) window.showToast("All projects data saved to file.", "success");
    } catch (e) {
        console.error("[LEFT_NAV] Error saving data to file:", e);
        if(window.showToast) window.showToast("Error saving data to file. Check console for details.", "error");
    }
}

function handleLoadAllProjectsFile(event) {
    console.log("[LEFT_NAV] handleLoadAllProjectsFile triggered.");
    const file = event.target.files[0];
    if (!file) {
        console.log("[LEFT_NAV] No file selected for loading.");
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedData = JSON.parse(e.target.result);
            // Basic validation of the loaded data structure
            if (typeof loadedData === 'object' && loadedData !== null && 
                Object.keys(loadedData).every(key => 
                    loadedData[key] && // project exists
                    typeof loadedData[key].projectInfo === 'object' && // projectInfo exists and is an object
                    Array.isArray(loadedData[key].periods) // periods exists and is an array
                )
            ) {
                window.allProjectsData = loadedData;
                console.log("[LEFT_NAV] Data loaded from file. Project count:", Object.keys(window.allProjectsData).length);
                window.saveAllDataToStorage(); // Persist to localStorage
                window.loadAllDataFromStorage(); // This will re-render and select default/stored selection
                if(window.showToast) window.showToast("Projects data loaded successfully from file.", "success");
            } else {
                throw new Error("Invalid JSON structure for project data. Expected projects with projectInfo and periods array.");
            }
        } catch (error) {
            console.error("[LEFT_NAV] Error parsing projects file:", error);
            if(window.showToast) window.showToast(`Failed to load file: ${error.message}`, "error", 7000);
        }
    };
    reader.readAsText(file);
    event.target.value = null; // Reset file input to allow loading same file again if needed
}

async function handleExportToPDF() {
    console.log("[LEFT_NAV_PDF] Advanced PDF generation started.");
    if (!window.currentProjectId || !window.currentPeriodId) {
        if (window.showToast) window.showToast("Please select a project and period to generate a PDF report.", "warning");
        return;
    }

    const project = window.allProjectsData[window.currentProjectId];
    const period = project.periods.find(p => p.id === window.currentPeriodId);

    if (!project || !period || !window.latestEvmResultsForCurrentPeriod) {
        if (window.showToast) window.showToast("Project, period, or EVM data not available for PDF report.", "error");
        return;
    }

    // --- Debugging Library Loading ---
    console.log("[LEFT_NAV_PDF_DEBUG] typeof window.jspdf:", typeof window.jspdf);
    if (window.jspdf) {
        console.log("[LEFT_NAV_PDF_DEBUG] typeof window.jspdf.jsPDF:", typeof window.jspdf.jsPDF);
    }
    console.log("[LEFT_NAV_PDF_DEBUG] typeof window.html2canvas:", typeof window.html2canvas);
    // --- End Debugging Library Loading ---

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        console.error("[LEFT_NAV_PDF] jsPDF library not loaded.");
        if(window.showToast) window.showToast("jsPDF library not loaded. Cannot generate report.", "error");
        return;
    }
    if (typeof window.html2canvas === 'undefined') {
        console.error("[LEFT_NAV_PDF] html2canvas library not loaded.");
        if(window.showToast) window.showToast("html2canvas library not loaded. Cannot capture charts.", "error");
        // You might decide to proceed with a text-only report if html2canvas is missing
    }

    const { jsPDF } = window.jspdf; 
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    console.log("[LEFT_NAV_PDF_DEBUG] Created jsPDF instance. typeof pdf.autoTable:", typeof pdf.autoTable); // Log type of autoTable here

    if (typeof pdf.autoTable !== 'function') {
        console.error("[LEFT_NAV_PDF] jsPDF-autoTable plugin method not found on jsPDF instance. Tables will not be generated correctly.");
        if(window.showToast) window.showToast("PDF Table plugin not available. Report might be incomplete.", "warning");
    }
    

    // Check for main libraries
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined' || typeof window.html2canvas === 'undefined') {
        console.error("[LEFT_NAV_PDF] Core PDF generation libraries (jsPDF or html2canvas) not loaded.");
        if(window.showToast) window.showToast("PDF libraries not loaded. Cannot generate report.", "error");
        return;
    }
    
    const evmResults = window.latestEvmResultsForCurrentPeriod;
    const periodMetrics = evmResults.periodMetrics;
    const cumulativeMetrics = evmResults.cumulativeMetrics;

    // --- PDF Styling and Layout Variables ---
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const baseFontSize = 10;
    const titleFontSize = 20;
    const headerFontSize = 14;
    const subHeaderFontSize = 12;
    const smallFontSize = 8;
    const defaultLineHeight = 6; // mm for baseFontSize
    let currentY = margin;

    // Helper to add text, manages currentY and page breaks
    function addStyledText(text, x, y, options = {}) {
        const { fontSize = baseFontSize, style = 'normal', color = '#000000', align = 'left', maxWidth = contentWidth } = options;
        pdf.setFontSize(fontSize);
        pdf.setFont(undefined, style);
        pdf.setTextColor(color);
        pdf.text(text, x, y, { align: align, maxWidth: maxWidth });
    }
    
    function checkNewPage(heightNeeded = defaultLineHeight * 2) {
        if (currentY + heightNeeded > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
            addHeaderFooter(); // Add header/footer to new page
            return true;
        }
        return false;
    }

    function addHeaderFooter() {
        // Footer example
        pdf.setFontSize(smallFontSize);
        pdf.setTextColor(150); // Gray
        const pageNum = pdf.internal.getNumberOfPages();
        pdf.text(`Page ${pageNum}`, pageWidth - margin - 10, pageHeight - margin + 7, {align: 'right'});
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pageHeight - margin + 7);
        // Header example (could be more complex)
        // pdf.setFontSize(smallFontSize);
        // pdf.text(`${project.projectInfo.projName} - EVM Report`, margin, margin / 2);
        // pdf.line(margin, margin / 2 + 2, pageWidth - margin, margin / 2 + 2); // Underline
    }
    addHeaderFooter(); // For the first page

    // --- PAGE 1: COVER / SUMMARY PAGE ---
    currentY = margin + 10;
    addStyledText("EVM Project Status Report", pageWidth / 2, currentY, { fontSize: titleFontSize, style: 'bold', align: 'center' });
    currentY += defaultLineHeight * 3;

    addStyledText("Project Overview", margin, currentY, { fontSize: headerFontSize, style: 'bold' });
    currentY += defaultLineHeight * 1.5;
    pdf.setFontSize(baseFontSize); pdf.setFont(undefined,'normal'); pdf.setTextColor(0);
    pdf.text(`Project Name:`, margin, currentY);
    pdf.text(project.projectInfo.projName || 'N/A', margin + 40, currentY);
    currentY += defaultLineHeight;
    pdf.text(`Reporting Period:`, margin, currentY);
    pdf.text(`${period.id} (Status Date: ${new Date(period.statusDate).toLocaleDateString()})`, margin + 40, currentY);
    currentY += defaultLineHeight * 2;

    addStyledText("Key Performance Summary (Cumulative)", margin, currentY, { fontSize: headerFontSize, style: 'bold' });
    currentY += defaultLineHeight * 1.5;
    
    const summaryTableBody = [
        ["Project % Complete:", (cumulativeMetrics.projectPercentComplete_toDate !== null ? cumulativeMetrics.projectPercentComplete_toDate.toFixed(1) + "%" : "N/A")],
        ["CPI (Cost Performance Index):", (cumulativeMetrics.CPI_toDate_Cost !== null ? cumulativeMetrics.CPI_toDate_Cost.toFixed(2) : "N/A")],
        ["SPI (Schedule Perf. Index):", (cumulativeMetrics.SPI_toDate_Cost !== null ? cumulativeMetrics.SPI_toDate_Cost.toFixed(2) : "N/A")],
        ["Estimate at Completion (EAC Cost):", (cumulativeMetrics.EAC_Cost_basic !== null ? cumulativeMetrics.EAC_Cost_basic.toLocaleString(undefined, {style:'currency', currency:'USD'}) : "N/A")], // Assuming USD, adjust as needed
        ["Variance at Completion (VAC Cost):", (cumulativeMetrics.VAC_Cost_basic !== null ? cumulativeMetrics.VAC_Cost_basic.toLocaleString(undefined, {style:'currency', currency:'USD'}) : "N/A")],
        ["Total Contract Value:", cumulativeMetrics.totalContractValue.toLocaleString(undefined, {style:'currency', currency:'USD'})],
        ["Est. Profit at Completion:", `${cumulativeMetrics.estProfitAtCompletion !== null ? cumulativeMetrics.estProfitAtCompletion.toLocaleString(undefined, {style:'currency', currency:'USD'}) : "N/A"} (${cumulativeMetrics.estProfitAtCompletionPercent !== null ? cumulativeMetrics.estProfitAtCompletionPercent.toFixed(1) + "%" : "N/A"})`],
    ];
    pdf.autoTable({
        startY: currentY,
        head: [[{content: 'Metric', styles: {fontStyle: 'bold'}}, {content: 'Value', styles: {fontStyle: 'bold'}}]],
        body: summaryTableBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133], textColor: 255, fontSize: baseFontSize },
        bodyStyles: { fontSize: baseFontSize -1 , cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 'auto', halign: 'right' } },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => { currentY = data.cursor.y + defaultLineHeight; addHeaderFooter(); } // Update currentY after table
    });
    // currentY is updated by didDrawPage hook


    // --- PAGE 2 (or new page): DASHBOARD CHARTS ---
    checkNewPage(pageHeight / 2); 
    currentY += defaultLineHeight; 
    addStyledText("Dashboard Visualizations", margin, currentY, { fontSize: headerFontSize, style: 'bold' });
    currentY += defaultLineHeight * 1.5;

    const chartElementsToCapture = [
        { id: 'sCurveChart', title: 'Cumulative Performance (S-Curve)' },
        { id: 'kpiTrendChart', title: 'KPI Trends (CPI & SPI)' },
        { id: 'varianceChart', title: 'Variance Trends (CV & SV)' },
    ];

    // Strategy: Activate dashboard tab, capture, then (optionally) restore original tab.
    const originalActiveTabContent = document.querySelector('.tab-content.active-content');
    const originalActiveTabLink = document.querySelector('.tab-link.active');
    
    // Declare dashboardTabEl HERE, before its first use
    const dashboardTabEl = document.getElementById('dashboardTab'); 
    const dashboardTabLink = Array.from(document.querySelectorAll('.tab-link')).find(link => {
        const onclickAttr = link.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes("'dashboardTab'"); // More robust check
    });

    if (!dashboardTabEl) {
        console.warn("[LEFT_NAV_PDF] Dashboard tab element ('dashboardTab') not found. Cannot capture charts.");
    } else if (dashboardTabLink && originalActiveTabLink) {
        if (!dashboardTabEl.classList.contains('active-content')) {
            console.log("[LEFT_NAV_PDF] Temporarily switching to Dashboard tab for chart capture.");
            dashboardTabLink.click(); 
            // Wait for charts to render - this is a simple timeout, might need adjustment or more robust solution
            await new Promise(resolve => setTimeout(resolve, 1500)); // Increased timeout slightly
        }
    } else {
        if (!dashboardTabLink) console.warn("[LEFT_NAV_PDF] Could not find dashboard tab link. Chart capture might fail.");
        if (!originalActiveTabLink) console.warn("[LEFT_NAV_PDF] Could not determine original active tab link.");
    }
    
    // Re-fetch dashboardTabEl in case the DOM was manipulated by the click, though usually not necessary for static elements
    // const currentDashboardTabEl = document.getElementById('dashboardTab'); // Or just use dashboardTabEl from above

    if (dashboardTabEl && dashboardTabEl.classList.contains('active-content')) {
        console.log("[LEFT_NAV_PDF] Dashboard tab is active, proceeding to capture charts.");
        for (const chartInfo of chartElementsToCapture) {
            checkNewPage(85); 
            addStyledText(chartInfo.title, margin, currentY, { fontSize: subHeaderFontSize, style: 'bold' });
            currentY += defaultLineHeight * 1.2;

            const chartElement = document.getElementById(chartInfo.id);
            if (chartElement && chartElement.offsetHeight > 10) { 
                // ... (the rest of your html2canvas capture logic - looks okay) ...
                try {
                    const canvas = await html2canvas(chartElement, { scale: 1.5, logging: false, useCORS: true, backgroundColor: null });
                    const imgData = canvas.toDataURL('image/png');
                    const imgProps = pdf.getImageProperties(imgData);
                    let pdfImgWidth = contentWidth;
                    let pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;
                    
                    const maxHeightForChart = pageHeight - currentY - margin - 5; 
                    if (pdfImgHeight > maxHeightForChart && maxHeightForChart > 40) { 
                        pdfImgHeight = maxHeightForChart;
                        pdfImgWidth = (imgProps.width * pdfImgHeight) / imgProps.height;
                    } else if (pdfImgHeight > maxHeightForChart) { 
                        if(checkNewPage(pdfImgHeight + 5)) { // If new page was added, re-evaluate available height
                             // currentY is now margin, so maxHeightForChart on new page is pageHeight - margin - margin - 5
                             const newPageMaxHeight = pageHeight - (2*margin) - 5;
                             if (pdfImgHeight > newPageMaxHeight) {
                                pdfImgHeight = newPageMaxHeight;
                                pdfImgWidth = (imgProps.width * pdfImgHeight) / imgProps.height;
                             }
                        }
                    }

                    if (pdfImgWidth > contentWidth) { 
                        pdfImgWidth = contentWidth;
                        pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;
                         const currentMaxHeight = pageHeight - currentY - margin - 5; // Recheck max height
                        if (pdfImgHeight > currentMaxHeight && currentMaxHeight > 40) {
                             pdfImgHeight = currentMaxHeight;
                        } else if (pdfImgHeight > currentMaxHeight) {
                            if(checkNewPage(pdfImgHeight + 5)){
                                const newPageMaxHeight = pageHeight - (2*margin) - 5;
                                if (pdfImgHeight > newPageMaxHeight) {
                                    pdfImgHeight = newPageMaxHeight;
                                    pdfImgWidth = (imgProps.width * pdfImgHeight) / imgProps.height;
                                }
                            }
                        }
                    }
                    
                    pdf.addImage(imgData, 'PNG', margin, currentY, pdfImgWidth, pdfImgHeight);
                    currentY += pdfImgHeight + defaultLineHeight; 
                    console.log(`[LEFT_NAV_PDF] Chart '${chartInfo.id}' added to PDF.`);
                } catch (err) {
                    console.error(`[LEFT_NAV_PDF] Error capturing chart '${chartInfo.id}':`, err);
                    if(checkNewPage()){ /* currentY reset */ }
                    pdf.text(`(Error capturing chart: ${chartInfo.title})`, margin, currentY, {textColor: 'red'});
                    currentY += defaultLineHeight;
                }
            } else {
                if(checkNewPage()){ /* currentY reset */ }
                pdf.text(`(Chart element for '${chartInfo.title}' not found or not visible for capture)`, margin, currentY);
                currentY += defaultLineHeight;
            }
        }
    } else {
        if(checkNewPage()){ /* currentY reset */ }
        addStyledText("Dashboard charts could not be included (Dashboard tab was not accessible or charts not rendered).", margin, currentY, {maxWidth: contentWidth});
        currentY += defaultLineHeight * 2;
    }
    
    // Restore original tab if we switched
    if (originalActiveTabLink && dashboardTabLink && originalActiveTabContent && !originalActiveTabContent.classList.contains('active-content')) {
        console.log("[LEFT_NAV_PDF] Restoring original active tab:", originalActiveTabLink.textContent);
        originalActiveTabLink.click();
        await new Promise(resolve => setTimeout(resolve, 300)); 
    }


    // --- PAGE 3 (or new page): DETAILED EVM METRICS TABLE ---
    checkNewPage(pageHeight / 2); // Check space for table
    currentY += defaultLineHeight;
    addStyledText("Detailed EVM Performance Metrics", margin, currentY, { fontSize: headerFontSize, style: 'bold' });
    currentY += defaultLineHeight * 1.5;

    const metricsTableBody = [
        // Period Metrics
        [{content: "Period Performance (Cost-Based)", colSpan: 2, styles: {fontStyle: 'bold', halign: 'center', fillColor: [230,230,230] }}],
        ["PV (Period - Cost)", periodMetrics.PV_Cost !== null ? periodMetrics.PV_Cost.toLocaleString() : "N/A"],
        ["EV (Period - Cost)", periodMetrics.EV_Cost !== null ? periodMetrics.EV_Cost.toLocaleString() : "N/A"],
        ["AC (Period)", periodMetrics.AC_Cost !== null ? periodMetrics.AC_Cost.toLocaleString() : "N/A"],
        ["SV (Period - Cost)", periodMetrics.SV_Cost !== null ? periodMetrics.SV_Cost.toLocaleString() : "N/A"],
        ["CV (Period - Cost)", periodMetrics.CV_Cost !== null ? periodMetrics.CV_Cost.toLocaleString() : "N/A"],
        ["SPI (Period - Cost)", periodMetrics.SPI_Cost !== null ? periodMetrics.SPI_Cost.toFixed(2) : "N/A"],
        ["CPI (Period - Cost)", periodMetrics.CPI_Cost !== null ? periodMetrics.CPI_Cost.toFixed(2) : "N/A"],
        // Cumulative Metrics
        [{content: "Project Cumulative & Forecast (Cost-Based)", colSpan: 2, styles: {fontStyle: 'bold', halign: 'center', fillColor: [230,230,230] }}],
        ["Project BAC (Cost)", cumulativeMetrics.projectBAC_Cost !== null ? cumulativeMetrics.projectBAC_Cost.toLocaleString() : "N/A"],
        ["EV (To Date - Cost)", cumulativeMetrics.EV_toDate_Cost !== null ? cumulativeMetrics.EV_toDate_Cost.toLocaleString() : "N/A"],
        ["AC (To Date)", cumulativeMetrics.AC_toDate !== null ? cumulativeMetrics.AC_toDate.toLocaleString() : "N/A"],
        ["PV (To Date - Cost)", cumulativeMetrics.PV_toDate_Cost !== null ? cumulativeMetrics.PV_toDate_Cost.toLocaleString() : "N/A"],
        ["SV (To Date - Cost)", cumulativeMetrics.SV_toDate_Cost !== null ? cumulativeMetrics.SV_toDate_Cost.toLocaleString() : "N/A"],
        ["CV (To Date - Cost)", cumulativeMetrics.CV_toDate_Cost !== null ? cumulativeMetrics.CV_toDate_Cost.toLocaleString() : "N/A"],
        ["SPI (To Date - Cost)", cumulativeMetrics.SPI_toDate_Cost !== null ? cumulativeMetrics.SPI_toDate_Cost.toFixed(2) : "N/A"],
        ["CPI (To Date - Cost)", cumulativeMetrics.CPI_toDate_Cost !== null ? cumulativeMetrics.CPI_toDate_Cost.toFixed(2) : "N/A"],
        ["EAC (Basic - Cost)", cumulativeMetrics.EAC_Cost_basic !== null ? cumulativeMetrics.EAC_Cost_basic.toLocaleString() : "N/A"],
        ["EAC (Alt - Cost)", cumulativeMetrics.EAC_Cost_alt1 !== null ? cumulativeMetrics.EAC_Cost_alt1.toLocaleString() : "N/A"],
        ["VAC (Cost)", cumulativeMetrics.VAC_Cost_basic !== null ? cumulativeMetrics.VAC_Cost_basic.toLocaleString() : "N/A"],
        ["TCPI (to BAC - Cost)", cumulativeMetrics.TCPI_BAC_Cost !== null ? cumulativeMetrics.TCPI_BAC_Cost.toFixed(2) : "N/A"],
    ];

    pdf.autoTable({
        startY: currentY,
        head: [[{content: 'Metric', styles: {fontStyle: 'bold'}}, {content: 'Value', styles: {fontStyle: 'bold'}}]],
        body: metricsTableBody,
        theme: 'striped', // or 'grid' or 'plain'
        headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: baseFontSize },
        bodyStyles: { fontSize: baseFontSize - 1, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 'wrap', fontStyle: 'bold' }, 1: { cellWidth: 'auto', halign: 'right' } },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => { currentY = data.cursor.y + defaultLineHeight; addHeaderFooter(); }
    });


    // --- Finalize and Save PDF ---
    const safeProjectName = (project.projectInfo.projName || "Report").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const pdfFileName = `EVM_Report_${safeProjectName}_${period.id}_${new Date().toISOString().slice(0,10)}.pdf`;
    
    try {
        pdf.save(pdfFileName);
        if (window.showToast) window.showToast("PDF report generated successfully!", "success");
        console.log("[LEFT_NAV_PDF] PDF report generation complete:", pdfFileName);
    } catch (e) {
        console.error("[LEFT_NAV_PDF] Error saving PDF:", e);
        if (window.showToast) window.showToast("Error saving PDF. See console.", "error");
    }
}

// This can be at the bottom of leftNavPanel.js or in a new dedicated file like 'js/sampleData.js'
// If in a new file, make sure to include <script src="js/sampleData.js"></script> in index.html BEFORE leftNavPanel.js

const sampleConstructionProject = {
  "proj_skyline_tower_p1": {
    "id": "proj_skyline_tower_p1",
    "projectInfo": {
      "projNo": "SKYLN-DT-2024-P1",
      "projName": "Skyline Tower - Phase 1 (Sub & Superstructure)",
      "clientName": "Metropolis Development Group",
      "consultantName": "Apex Engineering & Design",
      "contractType": "Guaranteed Maximum Price (GMP)",
      "projScheduledDays": 540, // Approx 18 months
      "projectStartDate": "2024-01-15"
    },
    "periods": [
      { // Month 1: Mobilization & Early Earthwork
        "id": "2024-02", // End of Feb reporting
        "statusDate": "2024-02-29",
        "bidItems": [
          {
            "itemNumber": "A.1000", "description": "General Requirements & Mobilization", "unit": "LS",
            "totalContractQty": 1, "unitCost": 1200000, "unitContractPrice": 1350000,
            "totalCostBudget_item": 1200000, "totalContractPrice_item": 1350000, "plannedProfit_item": 150000,
            "plannedQty_period": 0.5, "plannedValue_period_cost": 600000,
            "unitsCompleted_toDate": 0.6, "percentComplete_toDate": 60, "earnedValue_toDate_cost": 720000, "actualCost_toDate": 700000
          },
          {
            "itemNumber": "B.2000", "description": "Site Clearing & Mass Excavation", "unit": "LS", // Could be CY too
            "totalContractQty": 1, "unitCost": 850000, "unitContractPrice": 950000,
            "totalCostBudget_item": 850000, "totalContractPrice_item": 950000, "plannedProfit_item": 100000,
            "plannedQty_period": 0.3, "plannedValue_period_cost": 255000,
            "unitsCompleted_toDate": 0.25, "percentComplete_toDate": 25, "earnedValue_toDate_cost": 212500, "actualCost_toDate": 240000
          },
          {
            "itemNumber": "C.3100", "description": "Foundation Piles - Supply & Install", "unit": "EA", // Each pile
            "totalContractQty": 250, "unitCost": 7500, "unitContractPrice": 8500,
            "totalCostBudget_item": 1875000, "totalContractPrice_item": 2125000, "plannedProfit_item": 250000,
            "plannedQty_period": 0, "plannedValue_period_cost": 0, // Not started this period
            "unitsCompleted_toDate": 0, "percentComplete_toDate": 0, "earnedValue_toDate_cost": 0, "actualCost_toDate": 0
          }
        ]
      },
      { // Month 2: Pile Caps & Grade Beams
        "id": "2024-03",
        "statusDate": "2024-03-31",
        "bidItems": [
          {
            "itemNumber": "A.1000", "description": "General Requirements & Mobilization", "unit": "LS",
            "totalContractQty": 1, "unitCost": 1200000, "unitContractPrice": 1350000,
            "totalCostBudget_item": 1200000, "totalContractPrice_item": 1350000, "plannedProfit_item": 150000,
            "plannedQty_period": 0.5, "plannedValue_period_cost": 600000, // Remaining mobilization
            "unitsCompleted_toDate": 1, "percentComplete_toDate": 100, "earnedValue_toDate_cost": 1200000, "actualCost_toDate": 1150000 // Completed under budget
          },
          {
            "itemNumber": "B.2000", "description": "Site Clearing & Mass Excavation", "unit": "LS",
            "totalContractQty": 1, "unitCost": 850000, "unitContractPrice": 950000,
            "totalCostBudget_item": 850000, "totalContractPrice_item": 950000, "plannedProfit_item": 100000,
            "plannedQty_period": 0.7, "plannedValue_period_cost": 595000, // Remaining excavation
            "unitsCompleted_toDate": 0.8, "percentComplete_toDate": 80, "earnedValue_toDate_cost": 680000, "actualCost_toDate": 700000 // Still some issues
          },
          {
            "itemNumber": "C.3100", "description": "Foundation Piles - Supply & Install", "unit": "EA",
            "totalContractQty": 250, "unitCost": 7500, "unitContractPrice": 8500,
            "totalCostBudget_item": 1875000, "totalContractPrice_item": 2125000, "plannedProfit_item": 250000,
            "plannedQty_period": 100, "plannedValue_period_cost": 750000, // 100 piles * 7500
            "unitsCompleted_toDate": 80, "percentComplete_toDate": 32, "earnedValue_toDate_cost": 600000, "actualCost_toDate": 620000 // 80 piles * 7500
          },
          {
            "itemNumber": "C.3200", "description": "Pile Caps - Form, Rebar, Pour", "unit": "CY", // Concrete volume
            "totalContractQty": 1200, "unitCost": 450, "unitContractPrice": 520,
            "totalCostBudget_item": 540000, "totalContractPrice_item": 624000, "plannedProfit_item": 84000,
            "plannedQty_period": 200, "plannedValue_period_cost": 90000, // 200 CY * 450
            "unitsCompleted_toDate": 150, "percentComplete_toDate": 12.5, "earnedValue_toDate_cost": 67500, "actualCost_toDate": 75000
          }
        ]
      },
      { // Month 3: Basement Slab & Walls
        "id": "2024-04",
        "statusDate": "2024-04-30",
        "bidItems": [
           { // A100 completed
            "itemNumber": "A.1000", "description": "General Requirements & Mobilization", "unit": "LS",
            "totalContractQty": 1, "unitCost": 1200000, "unitContractPrice": 1350000,
            "totalCostBudget_item": 1200000, "totalContractPrice_item": 1350000, "plannedProfit_item": 150000,
            "plannedQty_period": 0, "plannedValue_period_cost": 0,
            "unitsCompleted_toDate": 1, "percentComplete_toDate": 100, "earnedValue_toDate_cost": 1200000, "actualCost_toDate": 1150000
          },
          { // B200 completed
            "itemNumber": "B.2000", "description": "Site Clearing & Mass Excavation", "unit": "LS",
            "totalContractQty": 1, "unitCost": 850000, "unitContractPrice": 950000,
            "totalCostBudget_item": 850000, "totalContractPrice_item": 950000, "plannedProfit_item": 100000,
            "plannedQty_period": 0, "plannedValue_period_cost": 0, 
            "unitsCompleted_toDate": 1, "percentComplete_toDate": 100, "earnedValue_toDate_cost": 850000, "actualCost_toDate": 830000 // Completed, slightly over final AC
          },
          {
            "itemNumber": "C.3100", "description": "Foundation Piles - Supply & Install", "unit": "EA",
            "totalContractQty": 250, "unitCost": 7500, "unitContractPrice": 8500,
            "totalCostBudget_item": 1875000, "totalContractPrice_item": 2125000, "plannedProfit_item": 250000,
            "plannedQty_period": 150, "plannedValue_period_cost": 1125000, // Remaining piles
            "unitsCompleted_toDate": 250, "percentComplete_toDate": 100, "earnedValue_toDate_cost": 1875000, "actualCost_toDate": 1900000 // All piles done
          },
          {
            "itemNumber": "C.3200", "description": "Pile Caps - Form, Rebar, Pour", "unit": "CY",
            "totalContractQty": 1200, "unitCost": 450, "unitContractPrice": 520,
            "totalCostBudget_item": 540000, "totalContractPrice_item": 624000, "plannedProfit_item": 84000,
            "plannedQty_period": 500, "plannedValue_period_cost": 225000, 
            "unitsCompleted_toDate": 400, "percentComplete_toDate": 33.33, "earnedValue_toDate_cost": 180000, "actualCost_toDate": 195000
          },
          {
            "itemNumber": "D.4100", "description": "Basement Slab on Grade - Pour & Finish", "unit": "SF",
            "totalContractQty": 50000, "unitCost": 8, "unitContractPrice": 10, // Per SF
            "totalCostBudget_item": 400000, "totalContractPrice_item": 500000, "plannedProfit_item": 100000,
            "plannedQty_period": 10000, "plannedValue_period_cost": 80000, // 10k SF * $8
            "unitsCompleted_toDate": 5000, "percentComplete_toDate": 10, "earnedValue_toDate_cost": 40000, "actualCost_toDate": 45000
          }
        ]
      }
    ],
    "cumulativeEvmMetrics": null // This will be populated by app.js
  }
};