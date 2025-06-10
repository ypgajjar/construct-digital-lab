/**
 * Calculates COST-BASED EVM metrics and derived project financials.
 */
window.calculateAllEVM = function(
    currentPeriodBidItems_input,
    projectOverallInfo, 
    allProjectPeriods_input,
    currentPeriodObject
) {
    // --- Initial Input Validation ---
    if (!allProjectPeriods_input || !currentPeriodObject) {
        console.error("[EVM_CALC] Missing critical allProjectPeriods_input or currentPeriodObject. Returning default results.");
        return generateDefaultEvmResults(currentPeriodObject);
    }
    if (!Array.isArray(currentPeriodBidItems_input)) {
        console.warn("[EVM_CALC] currentPeriodBidItems_input is not an array. Using empty array. Period:", currentPeriodObject.id);
        currentPeriodBidItems_input = [];
    }
    if (!Array.isArray(allProjectPeriods_input)) {
        console.error("[EVM_CALC] allProjectPeriods_input is not an array. Cannot proceed. Returning default results.");
        return generateDefaultEvmResults(currentPeriodObject);
    }

    console.log(`[EVM_CALC] Starting COST-BASED EVM Calculations for period: ${currentPeriodObject.id}`);

    // --- Determine Project BAC (Cost) and Total Contract Value ---
    const uniqueProjectItems = new Map();
    allProjectPeriods_input.forEach(period => {
        (period.bidItems || []).forEach(item => {
            const itemKey = item.itemNumber || item.description;
            if (itemKey) {
                const existing = uniqueProjectItems.get(itemKey);
                if (!existing || 
                    (existing.totalCostBudget_item === 0 && (parseFloat(item.totalCostBudget_item) || 0) !== 0) ||
                    (existing.totalContractPrice_item === 0 && (parseFloat(item.totalContractPrice_item) || 0) !== 0) ) {
                    uniqueProjectItems.set(itemKey, {
                        totalCostBudget_item: parseFloat(item.totalCostBudget_item) || 0,
                        totalContractPrice_item: parseFloat(item.totalContractPrice_item) || 0,
                    });
                }
            }
        });
    });
     currentPeriodBidItems_input.forEach(item => {
        const itemKey = item.itemNumber || item.description;
        if (itemKey) {
             uniqueProjectItems.set(itemKey, {
                totalCostBudget_item: parseFloat(item.totalCostBudget_item) || 0,
                totalContractPrice_item: parseFloat(item.totalContractPrice_item) || 0,
            });
        }
    });

    let finalProjectBAC_Cost = 0;
    let finalTotalContractValue = 0;
    uniqueProjectItems.forEach(itemDetails => {
        finalProjectBAC_Cost += itemDetails.totalCostBudget_item;
        finalTotalContractValue += itemDetails.totalContractPrice_item;
    });

    console.log(`[EVM_CALC] Derived Project BAC (Cost): ${finalProjectBAC_Cost}`);
    console.log(`[EVM_CALC] Derived Total Contract Value: ${finalTotalContractValue}`);

    // --- I. Calculate Period-Specific Metrics (Cost-Based) ---
    let periodPV_Cost = 0;
    let periodEV_Cost_interval = 0;
    let periodAC_interval = 0;

    const sortedPeriods = [...allProjectPeriods_input].sort((a, b) => new Date(a.statusDate) - new Date(b.statusDate));
    const currentPeriodIndexInSorted = sortedPeriods.findIndex(p => p.id === currentPeriodObject.id);

    let previousPeriodCumulativeEV_Cost = 0;
    let previousPeriodCumulativeAC = 0;

    if (currentPeriodIndexInSorted > 0) {
        const previousPeriodObj = sortedPeriods[currentPeriodIndexInSorted - 1];
        if (previousPeriodObj && Array.isArray(previousPeriodObj.bidItems)) {
            previousPeriodObj.bidItems.forEach(item => {
                previousPeriodCumulativeEV_Cost += parseFloat(item.earnedValue_toDate_cost) || 0;
                previousPeriodCumulativeAC += parseFloat(item.actualCost_toDate) || 0;
            });
        }
    }

    let currentPeriodCumulativeEV_Cost = 0;
    let currentPeriodCumulativeAC = 0;
    currentPeriodBidItems_input.forEach(currentItem => {
        periodPV_Cost += parseFloat(currentItem.plannedValue_period_cost) || 0;
        currentPeriodCumulativeEV_Cost += parseFloat(currentItem.earnedValue_toDate_cost) || 0;
        currentPeriodCumulativeAC += parseFloat(currentItem.actualCost_toDate) || 0;
    });

    periodEV_Cost_interval = currentPeriodCumulativeEV_Cost - previousPeriodCumulativeEV_Cost;
    periodAC_interval = currentPeriodCumulativeAC - previousPeriodCumulativeAC;

    const periodSV_Cost = periodEV_Cost_interval - periodPV_Cost;
    const periodCV_Cost = periodEV_Cost_interval - periodAC_interval;
    
    let periodSPI_Cost = null;
    if (periodPV_Cost !== 0) periodSPI_Cost = periodEV_Cost_interval / periodPV_Cost;
    else if (periodEV_Cost_interval === 0 && periodPV_Cost === 0) periodSPI_Cost = 1;
    
    let periodCPI_Cost = null;
    if (periodAC_interval !== 0) periodCPI_Cost = periodEV_Cost_interval / periodAC_interval;
    else if (periodEV_Cost_interval === 0 && periodAC_interval === 0) periodCPI_Cost = 1;

    const periodMetrics = {
        statusDate: currentPeriodObject.statusDate, periodId: currentPeriodObject.id,
        PV_Cost: periodPV_Cost, EV_Cost: periodEV_Cost_interval, AC_Cost: periodAC_interval,
        SV_Cost: periodSV_Cost, CV_Cost: periodCV_Cost,
        SPI_Cost: (periodSPI_Cost !== null && isFinite(periodSPI_Cost)) ? periodSPI_Cost : null,
        CPI_Cost: (periodCPI_Cost !== null && isFinite(periodCPI_Cost)) ? periodCPI_Cost : null,
    };

    // --- II. Calculate Project-Cumulative Metrics (Cost-Based) & Historical Series ---
    let cumulativePV_Cost_fromPlan = 0;
    const historicalSeries = { dates: [], pv: [], ev: [], ac: [], cpi: [], spi: [], cv: [], sv: [] };

    sortedPeriods.forEach(loopPeriod => {
        let loopPeriod_IncrementalPV_Cost = 0;
        let loopPeriod_EV_Cost_toDate = 0;
        let loopPeriod_AC_toDate = 0;

        const itemsForLoopPeriod = (loopPeriod.id === currentPeriodObject.id) ?
                                   currentPeriodBidItems_input : (loopPeriod.bidItems || []);

        if (Array.isArray(itemsForLoopPeriod)) {
            itemsForLoopPeriod.forEach(item => {
                loopPeriod_IncrementalPV_Cost += parseFloat(item.plannedValue_period_cost) || 0;
                loopPeriod_EV_Cost_toDate += parseFloat(item.earnedValue_toDate_cost) || 0;
                loopPeriod_AC_toDate += parseFloat(item.actualCost_toDate) || 0;
            });
        }
        
        cumulativePV_Cost_fromPlan += loopPeriod_IncrementalPV_Cost;

        if (new Date(loopPeriod.statusDate) <= new Date(currentPeriodObject.statusDate)) {
            historicalSeries.dates.push(new Date(loopPeriod.statusDate).getTime());
            historicalSeries.pv.push(cumulativePV_Cost_fromPlan);
            historicalSeries.ev.push(loopPeriod_EV_Cost_toDate);
            historicalSeries.ac.push(loopPeriod_AC_toDate);

            let histSPI = null;
            if (cumulativePV_Cost_fromPlan !== 0) histSPI = loopPeriod_EV_Cost_toDate / cumulativePV_Cost_fromPlan;
            else if (loopPeriod_EV_Cost_toDate === 0 && cumulativePV_Cost_fromPlan === 0) histSPI = 1;

            let histCPI = null;
            if (loopPeriod_AC_toDate !== 0) histCPI = loopPeriod_EV_Cost_toDate / loopPeriod_AC_toDate;
            else if (loopPeriod_EV_Cost_toDate === 0 && loopPeriod_AC_toDate === 0) histCPI = 1;
            
            historicalSeries.spi.push((histSPI !== null && isFinite(histSPI)) ? histSPI : null);
            historicalSeries.cpi.push((histCPI !== null && isFinite(histCPI)) ? histCPI : null);
            historicalSeries.sv.push(loopPeriod_EV_Cost_toDate - cumulativePV_Cost_fromPlan);
            historicalSeries.cv.push(loopPeriod_EV_Cost_toDate - loopPeriod_AC_toDate);
        }
    });

    const finalCumulativePV_Cost_toDate = cumulativePV_Cost_fromPlan;
    const finalCumulativeEV_Cost_toDate = currentPeriodCumulativeEV_Cost;
    const finalCumulativeAC_toDate = currentPeriodCumulativeAC;

    let finalCumSPI_Cost = null;
    if (finalCumulativePV_Cost_toDate !== 0) finalCumSPI_Cost = finalCumulativeEV_Cost_toDate / finalCumulativePV_Cost_toDate;
    else if (finalCumulativeEV_Cost_toDate === 0 && finalCumulativePV_Cost_toDate === 0) finalCumSPI_Cost = 1;

    let finalCumCPI_Cost = null;
    if (finalCumulativeAC_toDate !== 0) finalCumCPI_Cost = finalCumulativeEV_Cost_toDate / finalCumulativeAC_toDate;
    else if (finalCumulativeEV_Cost_toDate === 0 && finalCumulativeAC_toDate === 0) finalCumCPI_Cost = 1;

    // Forecasts (Cost-Based)
    let EAC_Cost_basic = null;
    if (finalCumCPI_Cost !== null && finalCumCPI_Cost !== 0 && isFinite(finalCumCPI_Cost)) {
        EAC_Cost_basic = finalProjectBAC_Cost / finalCumCPI_Cost;
    } else if (finalProjectBAC_Cost > 0 && finalCumulativeAC_toDate > 0 && (finalCumCPI_Cost === 0 || finalCumCPI_Cost === null)) {
         EAC_Cost_basic = finalCumulativeAC_toDate + (finalProjectBAC_Cost - finalCumulativeEV_Cost_toDate);
    } else if (finalProjectBAC_Cost === 0 && finalCumulativeAC_toDate > 0) {
         EAC_Cost_basic = finalCumulativeAC_toDate;
    } else if (finalProjectBAC_Cost > 0 && finalCumulativeAC_toDate === 0 && finalCumulativeEV_Cost_toDate === 0 && finalCumCPI_Cost === 1) { // No progress, no cost, on budget
        EAC_Cost_basic = finalProjectBAC_Cost;
    }


    const EAC_Cost_alt1 = finalCumulativeAC_toDate + (finalProjectBAC_Cost - finalCumulativeEV_Cost_toDate);
    const VAC_Cost_basic = (EAC_Cost_basic !== null && isFinite(EAC_Cost_basic)) ? finalProjectBAC_Cost - EAC_Cost_basic : null;

    let TCPI_BAC_Cost = null;
    const workRemaining_Cost = finalProjectBAC_Cost - finalCumulativeEV_Cost_toDate;
    const budgetRemaining_Cost = finalProjectBAC_Cost - finalCumulativeAC_toDate;

    if (workRemaining_Cost <= 0) {
        TCPI_BAC_Cost = (finalCumCPI_Cost !== null && isFinite(finalCumCPI_Cost)) ? finalCumCPI_Cost : 1;
    } else if (budgetRemaining_Cost > 0) {
        TCPI_BAC_Cost = workRemaining_Cost / budgetRemaining_Cost;
    } else if (budgetRemaining_Cost <= 0 && workRemaining_Cost > 0) {
        TCPI_BAC_Cost = Infinity;
    }
    if (TCPI_BAC_Cost !== null && !isFinite(TCPI_BAC_Cost)) TCPI_BAC_Cost = null;

    // Project % Complete (To Date)
    let projectPercentComplete_toDate = null;
    if (finalProjectBAC_Cost > 0 && finalCumulativeEV_Cost_toDate !== null && isFinite(finalCumulativeEV_Cost_toDate)) {
        projectPercentComplete_toDate = (finalCumulativeEV_Cost_toDate / finalProjectBAC_Cost) * 100;
    } else if (finalProjectBAC_Cost === 0 && finalCumulativeEV_Cost_toDate > 0) {
        projectPercentComplete_toDate = 100; 
    } else if (finalProjectBAC_Cost === 0 && (finalCumulativeEV_Cost_toDate === 0 || finalCumulativeEV_Cost_toDate === null)) {
        projectPercentComplete_toDate = 0; 
    }


    // Margin Analysis
    let totalPlannedProfit, totalPlannedProfitPercent;
    let estProfitAtCompletion, estProfitAtCompletionPercent;

    if (finalTotalContractValue > 0 || finalProjectBAC_Cost > 0) {
        totalPlannedProfit = finalTotalContractValue - finalProjectBAC_Cost;
        if (finalTotalContractValue !== 0) {
            totalPlannedProfitPercent = (totalPlannedProfit / finalTotalContractValue) * 100;
        } else { 
            totalPlannedProfitPercent = (finalProjectBAC_Cost > 0) ? -Infinity : 0;
        }
    } else {
        totalPlannedProfit = null; totalPlannedProfitPercent = null;
    }
    
    if (finalTotalContractValue > 0 && EAC_Cost_basic !== null && isFinite(EAC_Cost_basic)) {
        estProfitAtCompletion = finalTotalContractValue - EAC_Cost_basic;
         if (finalTotalContractValue !== 0) {
            estProfitAtCompletionPercent = (estProfitAtCompletion / finalTotalContractValue) * 100;
        } else {
             estProfitAtCompletionPercent = (EAC_Cost_basic > 0) ? -Infinity : 0;
        }
    } else if (finalTotalContractValue === 0 && EAC_Cost_basic !== null && isFinite(EAC_Cost_basic)) {
        estProfitAtCompletion = -EAC_Cost_basic;
        estProfitAtCompletionPercent = (EAC_Cost_basic > 0) ? -Infinity : 0;
    }
    else {
        estProfitAtCompletion = null; estProfitAtCompletionPercent = null;
    }

    const cumulativeMetrics = {
        projectBAC_Cost: finalProjectBAC_Cost,
        totalContractValue: finalTotalContractValue,
        PV_toDate_Cost: finalCumulativePV_Cost_toDate,
        EV_toDate_Cost: finalCumulativeEV_Cost_toDate,
        AC_toDate: finalCumulativeAC_toDate,
        SV_toDate_Cost: finalCumulativeEV_Cost_toDate - finalCumulativePV_Cost_toDate,
        CV_toDate_Cost: finalCumulativeEV_Cost_toDate - finalCumulativeAC_toDate,
        SPI_toDate_Cost: (finalCumSPI_Cost !== null && isFinite(finalCumSPI_Cost)) ? finalCumSPI_Cost : null,
        CPI_toDate_Cost: (finalCumCPI_Cost !== null && isFinite(finalCumCPI_Cost)) ? finalCumCPI_Cost : null,
        
        projectPercentComplete_toDate: (projectPercentComplete_toDate !== null && isFinite(projectPercentComplete_toDate)) ? projectPercentComplete_toDate : null, // ADDED

        EAC_Cost_basic: (EAC_Cost_basic !== null && isFinite(EAC_Cost_basic)) ? EAC_Cost_basic : null,
        EAC_Cost_alt1: (isFinite(EAC_Cost_alt1)) ? EAC_Cost_alt1 : null,
        VAC_Cost_basic: VAC_Cost_basic,
        TCPI_BAC_Cost: TCPI_BAC_Cost,
        
        totalPlannedProfit: totalPlannedProfit,
        totalPlannedProfitPercent: (totalPlannedProfitPercent !== null && isFinite(totalPlannedProfitPercent)) ? totalPlannedProfitPercent : null,
        estProfitAtCompletion: estProfitAtCompletion,
        estProfitAtCompletionPercent: (estProfitAtCompletionPercent !== null && isFinite(estProfitAtCompletionPercent)) ? estProfitAtCompletionPercent : null,
    };
    
    return {
        periodMetrics: periodMetrics,
        cumulativeMetrics: cumulativeMetrics,
        historicalSeries: historicalSeries
    };
};

function generateDefaultEvmResults(currentPeriodObj = null) {
    const statusDate = currentPeriodObj ? currentPeriodObj.statusDate : new Date().toISOString().split('T')[0];
    const periodId = currentPeriodObj ? currentPeriodObj.id : 'N/A';
    const defaultPeriodMetrics = {
        PV_Cost: 0, EV_Cost: 0, AC_Cost: 0, SV_Cost: 0, CV_Cost: 0, SPI_Cost: null, CPI_Cost: null,
    };
    const defaultCumulativeMetrics = {
        projectBAC_Cost: 0, totalContractValue: 0,
        PV_toDate_Cost: 0, EV_toDate_Cost: 0, AC_toDate: 0, SV_toDate_Cost: 0, CV_toDate_Cost: 0,
        SPI_toDate_Cost: null, CPI_toDate_Cost: null, 
        projectPercentComplete_toDate: null, // ADDED DEFAULT
        EAC_Cost_basic: null, EAC_Cost_alt1: null, VAC_Cost_basic: null,
        TCPI_BAC_Cost: null, 
        totalPlannedProfit: null, totalPlannedProfitPercent: null,
        estProfitAtCompletion: null, estProfitAtCompletionPercent: null,
    };
    return {
        periodMetrics: { ...defaultPeriodMetrics, statusDate: statusDate, periodId: periodId },
        cumulativeMetrics: defaultCumulativeMetrics,
        historicalSeries: { dates: [], pv: [], ev: [], ac: [], cpi: [], spi: [], cv: [], sv: [] }
    };
}