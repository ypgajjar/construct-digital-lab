// js/dataEntry.js

let bidItemRowCounterForPeriod = 0;

// Helper to create a cell, optionally editable
function createCell(content = '', isEditable = false, isNumeric = false, fieldOrClassSuffix = '', title = '') {
    const cell = document.createElement('td');
    cell.textContent = content;
    if (title) cell.title = title;

    if (isEditable) {
        cell.contentEditable = "true";
        cell.classList.add('editable-cell');
        if (isNumeric) cell.classList.add('numeric');
        cell.dataset.field = fieldOrClassSuffix; 
    } else {
        cell.classList.add('calculated-cell'); 
        if (isNumeric && fieldOrClassSuffix !== 'percent-complete-toDate') {
             cell.classList.add('numeric');
        }
        if (fieldOrClassSuffix) cell.classList.add(`bid-item-${fieldOrClassSuffix}`); 
    }
    return cell;
}

// Helper to parse content of an editable cell
function getCellValue(cell, isNumeric = false) {
    if (!cell) return isNumeric ? 0 : '';
    const rawValue = cell.textContent.trim();
    if (isNumeric) {
        const num = parseFloat(rawValue.replace(/,/g, '')); // Remove commas for robust parsing
        return isNaN(num) ? 0 : num;
    }
    return rawValue;
}


window.addBidItemRow = function(itemData = null, isInitialLoadForPeriodTable = false) {
    // bidItemRowCounterForPeriod++; // We will set the number via renumbering later
    const tableBody = document.getElementById('bidItemTableBody');
    if (!tableBody) { /* ... error ... */ return; }

    const newRow = tableBody.insertRow();
    // newRow.setAttribute('data-internal-row-idx', bidItemRowCounterForPeriod); // Still useful for internal tracking if needed

    const data = itemData || { /* ... default data ... */ };

    // The first cell for row number will be populated by renumberTableRows
    newRow.appendChild(createCell('')); // Placeholder for Row #, will be updated
    newRow.appendChild(createCell(String(data.itemNumber), true, false, 'itemNumber', 'Bid Item Number'));
    // ... (append other cells as before) ...
    newRow.appendChild(createCell(String(data.description), true, false, 'description', 'Description'));
    newRow.appendChild(createCell(String(data.unit), true, false, 'unit', 'Unit of Measure'));
    newRow.appendChild(createCell(String(data.totalContractQty), true, true, 'totalContractQty', 'Total Contract Quantity'));
    newRow.appendChild(createCell(String(data.unitCost), true, true, 'unitCost', "Unit Cost (Contractor's Cost)"));
    newRow.appendChild(createCell(String(data.unitContractPrice), true, true, 'unitContractPrice', "Unit Contract Price (Client Price)"));
    newRow.appendChild(createCell('0.00', false, true, 'total-cost-budget', "Total Cost Budget for Item (Item BAC)"));
    newRow.appendChild(createCell('0.00', false, true, 'total-contract-price', "Total Contract Price for Item"));
    newRow.appendChild(createCell('0.00', false, true, 'planned-profit', "Planned Profit for Item"));
    newRow.appendChild(createCell(String(data.plannedQty_period), true, true, 'plannedQty_period', "Planned Quantity this Period"));
    newRow.appendChild(createCell('0.00', false, true, 'pv-cost-period', "Planned Value (Cost-Based) this Period"));
    newRow.appendChild(createCell(String(data.unitsCompleted_toDate), true, true, 'unitsCompleted_toDate', "Units Completed To Date"));
    newRow.appendChild(createCell('0.00%', false, false, 'percent-complete-toDate', "% Complete To Date"));
    newRow.appendChild(createCell('0.00', false, true, 'ev-cost-toDate', "Earned Value (Cost-Based) To Date"));
    newRow.appendChild(createCell(String(data.actualCost_toDate), true, true, 'actualCost_toDate', "Actual Cost To Date"));


    const actionCell = createCell('', false, false, '', 'Action');
    actionCell.classList.add('action-cell');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-row-btn icon-btn-tiny';
    deleteBtn.textContent = 'X';
    deleteBtn.title = 'Delete this bid item row';
    deleteBtn.addEventListener('click', function() {
        if (typeof window.showConfirmationModal === 'function') {
            window.showConfirmationModal("Are you sure you want to remove this bid item?", "Confirm Item Removal", () => {
                newRow.remove();
                renumberTableRows(tableBody); // << CALL RENUMBER AFTER DELETION
                updateTableFooterTotals_Cumulative();
                triggerGlobalCalculationAndUIUpdate();
                if(window.showToast) window.showToast("Bid item removed.", "info", 2000);
            });
        } else if (confirm("Are you sure you want to remove this bid item?")) {
            newRow.remove();
            renumberTableRows(tableBody); // << CALL RENUMBER AFTER DELETION
            updateTableFooterTotals_Cumulative();
            triggerGlobalCalculationAndUIUpdate();
        }
    });
    actionCell.appendChild(deleteBtn);
    newRow.appendChild(actionCell);

    newRow.querySelectorAll('td[contenteditable="true"]').forEach(cell => {
        cell.addEventListener('focus', handleCellFocus);
        cell.addEventListener('blur', handleCellChange);
        cell.addEventListener('keydown', handleCellKeydown);
    });

    calculateRowMetrics_Cumulative(newRow);
    
    if (!isInitialLoadForPeriodTable) {
        renumberTableRows(tableBody); // << CALL RENUMBER WHEN USER ADDS ROW
        updateTableFooterTotals_Cumulative();
    }
    // If it IS an initial load, renumbering will happen after all rows are populated in populateBidItemsTable
};

/**
 * Renumbers the first cell (serial number) of all rows in the given table body.
 * @param {HTMLTableSectionElement} tableBody - The tbody element of the table.
 */
function renumberTableRows(tableBody) {
    if (!tableBody) return;
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const firstCell = row.cells[0]; // Get the first cell (for serial number)
        if (firstCell) {
            firstCell.textContent = index + 1; // Set 1-based serial number
        }
    });
    // After renumbering, update the global counter if you still want to use it for "New Item X" default names,
    // though it's less critical if serial numbers are dynamic.
    bidItemRowCounterForPeriod = rows.length;
}

function handleCellFocus(event) {
    event.target.dataset.originalValue = event.target.textContent.trim();
}

function handleCellChange(event) {
    const cell = event.target;
    const row = cell.closest('tr');
    if (!row) return;

    if (cell.classList.contains('numeric')) {
        const originalValue = cell.dataset.originalValue || '0';
        let value = parseFloat(cell.textContent.trim().replace(/,/g, ''));
        if (isNaN(value)) {
            value = parseFloat(originalValue.replace(/,/g, ''));
            if (isNaN(value)) value = 0;
            cell.textContent = String(value); 
            if(window.showToast) window.showToast("Invalid number. Reverted.", "warning", 2000);
        }
    }
    calculateRowMetrics_Cumulative(row);
    updateTableFooterTotals_Cumulative();
    triggerGlobalCalculationAndUIUpdate();
}

function handleCellKeydown(event) {
    const cell = event.target;
    const originalValue = cell.dataset.originalValue || cell.textContent;

    if (event.key === 'Enter') {
        event.preventDefault();
        cell.blur();
    } else if (event.key === 'Escape') {
        cell.textContent = originalValue;
        cell.blur();
    }

    if (cell.classList.contains('numeric')) {
        const currentText = cell.textContent;
        let selectionStart = 0;
        try { 
            selectionStart = cell.ownerDocument.getSelection().getRangeAt(0).startOffset;
        } catch(e) { /* ignore */ }

        if (event.key.length === 1 && 
            !event.ctrlKey && !event.metaKey && !event.altKey &&
            !/[\d]/.test(event.key) && 
            !(event.key === '.' && !currentText.includes('.')) && 
            !(event.key === '-' && selectionStart === 0 && !currentText.includes('-', 1)) 
           ) {
            event.preventDefault();
        }
    }
}

function calculateRowMetrics_Cumulative(rowElement) {
    const getEditableCellByField = (field) => rowElement.querySelector(`td[data-field="${field}"]`);
    const getCalculatedCellByClassSuffix = (suffix) => rowElement.querySelector(`.bid-item-${suffix}`);

    const totalContractQty = getCellValue(getEditableCellByField('totalContractQty'), true); // CHANGED
    const unitCost = getCellValue(getEditableCellByField('unitCost'), true);
    const unitContractPrice = getCellValue(getEditableCellByField('unitContractPrice'), true); // CHANGED
    const plannedQty_period = getCellValue(getEditableCellByField('plannedQty_period'), true);
    const unitsCompleted_toDate = getCellValue(getEditableCellByField('unitsCompleted_toDate'), true);

    const totalCostBudgetForItem = totalContractQty * unitCost; // Uses totalContractQty
    const totalContractPriceForItem = totalContractQty * unitContractPrice; // Uses totalContractQty, CHANGED
    const plannedProfitForItem = totalContractPriceForItem - totalCostBudgetForItem; // CHANGED
    
    const tcbCell = getCalculatedCellByClassSuffix('total-cost-budget');
    if(tcbCell) tcbCell.textContent = totalCostBudgetForItem.toFixed(2);

    const tcpcCell = getCalculatedCellByClassSuffix('total-contract-price'); // CHANGED selector
    if(tcpcCell) tcpcCell.textContent = totalContractPriceForItem.toFixed(2);

    const ppCell = getCalculatedCellByClassSuffix('planned-profit');
    if(ppCell) ppCell.textContent = plannedProfitForItem.toFixed(2);

    const pvCostPeriod = plannedQty_period * unitCost;
    const pvcpCell = getCalculatedCellByClassSuffix('pv-cost-period');
    if(pvcpCell) pvcpCell.textContent = pvCostPeriod.toFixed(2);

    let percentComplete_toDate = 0;
    if (totalContractQty > 0) percentComplete_toDate = (unitsCompleted_toDate / totalContractQty) * 100; // Uses totalContractQty
    else if (unitsCompleted_toDate > 0 && totalContractQty === 0) percentComplete_toDate = 100;
    
    const pctdCell = getCalculatedCellByClassSuffix('percent-complete-toDate');
    if(pctdCell) pctdCell.textContent = `${percentComplete_toDate.toFixed(2)}%`;

    const evCostToDate = totalCostBudgetForItem * (percentComplete_toDate / 100);
    const evctdCell = getCalculatedCellByClassSuffix('ev-cost-toDate');
    if(evctdCell) evctdCell.textContent = evCostToDate.toFixed(2);
}

function updateTableFooterTotals_Cumulative() {
    const tableBody = document.getElementById('bidItemTableBody');
    if (!tableBody) return;
    const rows = tableBody.querySelectorAll('tr');

    let sumTotalCostBudget = 0, sumTotalContractPrice = 0, sumTotalPlannedProfit = 0; // CHANGED
    let sumPVPeriod_Cost = 0, sumEVToDate_Cost = 0, sumACToDate = 0;

    rows.forEach(row => {
        sumTotalCostBudget += parseFloat(row.querySelector('.bid-item-total-cost-budget')?.textContent) || 0;
        sumTotalContractPrice += parseFloat(row.querySelector('.bid-item-total-contract-price')?.textContent) || 0; // CHANGED
        sumTotalPlannedProfit += parseFloat(row.querySelector('.bid-item-planned-profit')?.textContent) || 0;
        sumPVPeriod_Cost += parseFloat(row.querySelector('.bid-item-pv-cost-period')?.textContent) || 0;
        sumEVToDate_Cost += parseFloat(row.querySelector('.bid-item-ev-cost-toDate')?.textContent) || 0;
        sumACToDate += getCellValue(row.querySelector('td[data-field="actualCost_toDate"]'), true);
    });

    const footerTotalCostBudgetEl = document.getElementById('footerTotalCostBudget');
    if (footerTotalCostBudgetEl) footerTotalCostBudgetEl.textContent = sumTotalCostBudget.toFixed(2);

    const footerTotalContractPriceEl = document.getElementById('footerTotalContractPrice'); // CHANGED ID
    if (footerTotalContractPriceEl) footerTotalContractPriceEl.textContent = sumTotalContractPrice.toFixed(2);
    
    const footerTotalPlannedProfitEl = document.getElementById('footerTotalPlannedProfit');
    if (footerTotalPlannedProfitEl) footerTotalPlannedProfitEl.textContent = sumTotalPlannedProfit.toFixed(2);

    const footerTotalPVPeriod_CostEl = document.getElementById('footerTotalPVPeriod_Cost');
    if (footerTotalPVPeriod_CostEl) footerTotalPVPeriod_CostEl.textContent = sumPVPeriod_Cost.toFixed(2);

    const footerTotalEVToDate_CostEl = document.getElementById('footerTotalEVToDate_Cost');
    if (footerTotalEVToDate_CostEl) footerTotalEVToDate_CostEl.textContent = sumEVToDate_Cost.toFixed(2);

    const footerTotalACToDateEl = document.getElementById('footerTotalACToDate');
    if (footerTotalACToDateEl) footerTotalACToDateEl.textContent = sumACToDate.toFixed(2);
}


window.getBidItemsData = function() {
    const items = [];
    const tableBody = document.getElementById('bidItemTableBody');
    if (!tableBody) return items;

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const getEditableCellByField = (field) => row.querySelector(`td[data-field="${field}"]`);
        
        const totalContractQty = getCellValue(getEditableCellByField('totalContractQty'), true); // CHANGED
        const unitCost = getCellValue(getEditableCellByField('unitCost'), true);
        const unitContractPrice = getCellValue(getEditableCellByField('unitContractPrice'), true); // CHANGED
        const plannedQty_period = getCellValue(getEditableCellByField('plannedQty_period'), true);
        const unitsCompleted_toDate = getCellValue(getEditableCellByField('unitsCompleted_toDate'), true);

        const totalCostBudgetForItem = totalContractQty * unitCost; // Uses totalContractQty
        const totalContractPriceForItem = totalContractQty * unitContractPrice; // Uses totalContractQty, CHANGED
        const plannedProfitForItem = totalContractPriceForItem - totalCostBudgetForItem;
        const pvCostPeriod = plannedQty_period * unitCost;

        let percentComplete_toDate = 0;
        if (totalContractQty > 0) percentComplete_toDate = (unitsCompleted_toDate / totalContractQty) * 100; // Uses totalContractQty
        else if (unitsCompleted_toDate > 0) percentComplete_toDate = 100;
        
        const evCostToDate = totalCostBudgetForItem * (percentComplete_toDate / 100);

        items.push({
            itemNumber: getCellValue(getEditableCellByField('itemNumber')),
            description: getCellValue(getEditableCellByField('description')),
            unit: getCellValue(getEditableCellByField('unit')),
            totalContractQty, // CHANGED from totalPlannedQty
            unitCost, 
            unitContractPrice, // CHANGED from unitSellPrice
            totalCostBudget_item: totalCostBudgetForItem,
            totalContractPrice_item: totalContractPriceForItem, // CHANGED
            plannedProfit_item: plannedProfitForItem,
            plannedQty_period,
            plannedValue_period_cost: pvCostPeriod,
            unitsCompleted_toDate, percentComplete_toDate,
            earnedValue_toDate_cost: evCostToDate,
            actualCost_toDate: getCellValue(getEditableCellByField('actualCost_toDate'), true),
        });
    });
    return items;
};

window.populateBidItemsTable = function(itemsArray) {
    const tableBody = document.getElementById('bidItemTableBody');
    if (!tableBody) {
        console.error("[DATA_ENTRY] Table body 'bidItemTableBody' not found in populateBidItemsTable.");
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows
    // bidItemRowCounterForPeriod = 0; // Reset by renumberTableRows later

    if (itemsArray && itemsArray.length > 0) {
        itemsArray.forEach(itemData => window.addBidItemRow(itemData, true)); // Pass true for isInitialLoad
    }
    
    renumberTableRows(tableBody); // << CALL RENUMBER AFTER POPULATING ALL ROWS
    updateTableFooterTotals_Cumulative();
};

// ... (triggerGlobalCalculationAndUIUpdate, DOMContentLoaded, makeTableColumnsResizable remain the same as the previous full dataEntry.js)
let debounceTimerForDataEntry;
function triggerGlobalCalculationAndUIUpdate() {
    clearTimeout(debounceTimerForDataEntry);
    debounceTimerForDataEntry = setTimeout(() => {
        const calculateBtn = document.getElementById('calculateAllBtn');
        if (calculateBtn) calculateBtn.click();
        else console.error("[DATA_ENTRY] 'calculateAllBtn' not found for debounced trigger.");
    }, 750);
}

document.addEventListener('DOMContentLoaded', () => {
    const addBidItemToPeriodBtn = document.getElementById('addBidItemRowBtn');
    if (addBidItemToPeriodBtn) {
        addBidItemToPeriodBtn.addEventListener('click', () => {
            if (!window.currentProjectId || !window.currentPeriodId) {
                if (window.showToast) window.showToast("Please select a project and period first.", "warning");
                return;
            }
            window.addBidItemRow(null, false); 
            // Renumbering is now called inside addBidItemRow if not initial load
        });
    }

    const tableBody = document.getElementById('bidItemTableBody');
    if (tableBody) {
        renumberTableRows(tableBody); // Initial renumber on load, in case of existing rows
    }
    
    updateTableFooterTotals_Cumulative();

    const dataEntryTab = document.getElementById('dataEntryTab');
    const bidItemTable = document.getElementById('bidItemTable');
    if (bidItemTable && dataEntryTab && dataEntryTab.classList.contains('active-content')) {
        if (typeof window.makeTableColumnsResizable === 'function') {
            if (!bidItemTable.dataset.resizableInitialized) {
                window.makeTableColumnsResizable(bidItemTable);
                bidItemTable.dataset.resizableInitialized = "true";
            }
        }
    }
});

// In dataEntry.js (or tableUtils.js)

window.makeTableColumnsResizable = function(table) {
    if (!table) {
        console.warn("[TABLE_RESIZE] Table not provided.");
        return;
    }
    // Ensure table-layout is fixed, as this script relies on it.
    if (getComputedStyle(table).tableLayout !== 'fixed') {
        console.warn("[TABLE_RESIZE] Table layout is not 'fixed'. Resizing may not work as expected. Applying 'fixed' layout via JS.");
        table.style.tableLayout = 'fixed'; // Force it if not set by CSS, though CSS is better
    }

    const headers = table.querySelectorAll('thead th');
    if (!headers.length) {
        console.warn("[TABLE_RESIZE] No table headers found.");
        return;
    }

    console.log(`[TABLE_RESIZE] Initializing for ${headers.length} columns. Table ID: ${table.id}`);

    headers.forEach((header, index) => {
        // Clear any old handle first
        const oldHandle = header.querySelector('.resize-handle');
        if (oldHandle) oldHandle.remove();

        // Don't add to last column or specific non-resizable columns
        if (index < headers.length - 1 && !header.classList.contains('action-cell-header') && !header.classList.contains('no-resize')) {
            const resizeHandle = document.createElement('div');
            resizeHandle.classList.add('resize-handle');
            header.appendChild(resizeHandle);
            // console.log(`[TABLE_RESIZE] Added handle to header: "${header.textContent.trim()}"`);

            let startX, startWidth;

            const onMouseDown = (e) => {
                // e.stopPropagation(); // Prevent event from bubbling up if it causes issues
                e.preventDefault(); 
                
                startX = e.clientX;
                startWidth = header.offsetWidth; // Get current rendered width
                console.log(`[TABLE_RESIZE] Mousedown on "${header.textContent.trim()}": startX=${startX}, startWidth=${startWidth}`);

                if (startWidth === 0) {
                    console.warn("[TABLE_RESIZE] Header startWidth is 0. Check if table/headers are visible and rendered.");
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                document.body.style.cursor = 'col-resize';
                if (table) table.style.userSelect = 'none'; // Prevent text selection during drag
            };

            const onMouseMove = (e) => {
                if (startWidth === undefined) return; // Should not happen if mousedown worked
                const currentX = e.clientX;
                const diffX = currentX - startX;
                let newWidth = startWidth + diffX;
                
                newWidth = Math.max(newWidth, 40); // Minimum column width (e.g., 40px)
                
                header.style.width = `${newWidth}px`;
                // console.log(`[TABLE_RESIZE] MouseMove: newWidth=${newWidth}px for "${header.textContent.trim()}"`);
            };

            const onMouseUp = () => {
                console.log(`[TABLE_RESIZE] Mouseup on "${header.textContent.trim()}". Final explicit width: ${header.style.width}`);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                if (table) table.style.userSelect = '';
                // saveColumnWidths(table); // Optional
            };

            resizeHandle.addEventListener('mousedown', onMouseDown);
        }
    });
    // loadColumnWidths(table); // Optional
};