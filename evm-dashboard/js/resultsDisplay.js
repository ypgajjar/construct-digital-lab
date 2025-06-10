/**
 * Updates the EVM Results tab with calculated cost-based metrics and project financials.
 * @param {object | null} evmResults - The object containing { periodMetrics, cumulativeMetrics, historicalSeries }
 *                                     from evmCalculations.js, or null to clear.
 *                                     Metrics are now cost-based and new profit fields are included.
 */
window.updateResultsTab = function(evmResults = null) {
    console.log("[RESULTS_TAB] updateResultsTab called. Full evmResults received:", 
                evmResults ? JSON.parse(JSON.stringify(evmResults)) : null);

    function updateField(id, value, decimalPlaces = 2, isPercentage = false, isCurrency = true) {
        const element = document.getElementById(id);
        if (element) {
            let displayValue;
            if (value === null || value === undefined || (typeof value === 'number' && !isFinite(value))) {
                displayValue = (value === Infinity || value === -Infinity) ? "N/A" : '-';
            } else if (typeof value === 'number') {
                displayValue = isCurrency && !isPercentage ?
                    value.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }) :
                    value.toFixed(decimalPlaces);
                if (isPercentage) displayValue += '%';
            } else {
                displayValue = value.toString(); // Should not happen often if data is clean
            }
            element.textContent = displayValue;

            // Apply coloring for variance/margin fields
            element.classList.remove('positive-value-text', 'negative-value-text');
            const valueFieldsToColor = [
                'resSV_Cost', 'resCV_Cost', 'resVAC_Cost', 
                'resTotalPlannedProfit', 'resEstProfitAtCompletion'
            ];
            if (typeof value === 'number' && isFinite(value) && !isPercentage && valueFieldsToColor.includes(id)) {
                if (value > 0.001) element.classList.add('positive-value-text');
                else if (value < -0.001) element.classList.add('negative-value-text');
            }
        } else {
            console.warn(`[RESULTS_TAB] Element with ID '${id}' not found in results tab.`);
        }
    }

    if (!evmResults || !evmResults.periodMetrics || !evmResults.cumulativeMetrics) {
        console.warn("[RESULTS_TAB] No complete EVM metrics provided. Displaying placeholders.");
        const fieldsToClear = [
            // Period Performance
            'resPV_Cost', 'resEV_Cost', 'resAC_Cost', 'resSV_Cost', 'resCV_Cost', 
            'resSPI_Cost', 'resCPI_Cost',
            // Project Cumulative & Forecast
            'resBAC_Cost', 'resEAC_basic_Cost', 'resEAC_alt1_Cost', 'resVAC_Cost', 
            'resTCPI_BAC_Cost',
            // Margin Analysis
            'resTotalContractValue', 'resTotalPlannedProfit', 'resTotalPlannedProfitPercent',
            'resEstProfitAtCompletion', 'resEstProfitAtCompletionPercent'
        ];
        fieldsToClear.forEach(fieldId => updateField(fieldId, null));
        
        const periodTitleSpans = document.querySelectorAll('#evmResultsTab .current-period-title-tab.header-value');
        const currentPeriodDisplay = window.currentPeriodId ? 
            `${window.currentPeriodId} (${window.allProjectsData && window.allProjectsData[window.currentProjectId] && window.allProjectsData[window.currentProjectId].periods.find(p=>p.id===window.currentPeriodId) ? new Date(window.allProjectsData[window.currentProjectId].periods.find(p=>p.id===window.currentPeriodId).statusDate).toLocaleDateString() : 'N/A'})`
            : 'N/A';
        periodTitleSpans.forEach(span => span.textContent = currentPeriodDisplay);
        return;
    }

    const periodMetrics = evmResults.periodMetrics;
    const cumulativeMetrics = evmResults.cumulativeMetrics;

    // Update current period title spans in this tab
    const periodTitleSpans = document.querySelectorAll('#evmResultsTab .current-period-title-tab.header-value');
    const periodDisplayTitle = periodMetrics.periodId ?
        `${periodMetrics.periodId} (${new Date(periodMetrics.statusDate).toLocaleDateString()})` :
        (window.currentPeriodId || 'N/A');
    periodTitleSpans.forEach(span => span.textContent = periodDisplayTitle);

    // --- Update Period Performance (Cost-Based) section ---
    updateField('resPV_Cost', periodMetrics.PV_Cost);
    updateField('resEV_Cost', periodMetrics.EV_Cost);
    updateField('resAC_Cost', periodMetrics.AC_Cost); // AC is inherently cost
    updateField('resSV_Cost', periodMetrics.SV_Cost);
    updateField('resCV_Cost', periodMetrics.CV_Cost);
    updateField('resSPI_Cost', periodMetrics.SPI_Cost, 2, false, false); // SPI/CPI are ratios, not currency
    updateField('resCPI_Cost', periodMetrics.CPI_Cost, 2, false, false);

    // --- Update Project Cumulative & Forecast (Cost-Based) section ---
    updateField('resBAC_Cost', cumulativeMetrics.projectBAC_Cost);
    updateField('resEAC_basic_Cost', cumulativeMetrics.EAC_Cost_basic);
    updateField('resEAC_alt1_Cost', cumulativeMetrics.EAC_Cost_alt1);
    updateField('resVAC_Cost', cumulativeMetrics.VAC_Cost_basic);
    updateField('resTCPI_BAC_Cost', cumulativeMetrics.TCPI_BAC_Cost, 2, false, false);

    // --- Update Project Margin Analysis section ---
    updateField('resTotalContractValue', cumulativeMetrics.totalContractValue);
    updateField('resTotalPlannedProfit', cumulativeMetrics.totalPlannedProfit);
    updateField('resTotalPlannedProfitPercent', cumulativeMetrics.totalPlannedProfitPercent, 2, true, false);
    updateField('resEstProfitAtCompletion', cumulativeMetrics.estProfitAtCompletion);
    updateField('resEstProfitAtCompletionPercent', cumulativeMetrics.estProfitAtCompletionPercent, 2, true, false);
    
    // console.log("[RESULTS_TAB] EVM Results Tab updated successfully with cost-based metrics.");
};

/* 
    // Use the value we just debugged for the updateField call
    console.log(`[RESULTS_TAB] Attempting to update resBudgetedMarginPercent with (Bracket Access) value: ${valFromDirectAccess}`);
    updateField('resBudgetedMarginPercent', valFromDirectAccess, 2, true, false);

    updateField('resCurrentMargin', cumulativeMetrics.currentEstGrossMargin);
    updateField('resCurrentMarginPercent', cumulativeMetrics.currentEstGrossMarginPercent, 2, true, false);

    console.log("[RESULTS_TAB] EVM Results Tab updated successfully."); */