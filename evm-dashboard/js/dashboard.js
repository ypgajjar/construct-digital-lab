// js/dashboard.js

// Chart instances (global within this file)
let overallProgressDonutChart = null;
let progressDeviationChartInstance = null;
let sCurveChartInstance = null;
let cpiGaugePeriodChart = null;
let spiGaugePeriodChart = null;
let kpiTrendChartInstance = null;
let varianceChartInstance = null;

// COMMON CHART OPTIONS
const commonChartOptions = {
    chart: {
        foreColor: '#A0AEC0',
        toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false }},
        animations: { enabled: true, easing: 'easeinout', speed: 600 }
    },
    grid: { borderColor: '#374151', strokeDashArray: 3, padding: { left: 5, right: 15 } },
    xaxis: {
        labels: { style: { colors: '#A0AEC0', fontSize: '10px' } },
        axisBorder: { show: false },
        axisTicks: { show: true, color: '#4A5568', height: 4 },
    },
    yaxis: {
        labels: {
            style: { colors: '#A0AEC0', fontSize: '10px' },
            formatter: function (value) {
                if (value === null || value === undefined || !isFinite(value)) return '';
                if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                if (Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
                return value.toFixed(0);
            }
        },
    },
    tooltip: { theme: 'dark', style: { fontSize: '12px' } }, // Default x tooltip format handled by chart type
    legend: { labels: { colors: '#CBD5E0' }, position: 'top', horizontalAlign: 'left', offsetY: -5, fontSize: '12px', itemMargin: {horizontal: 8, vertical: 3}},
    dataLabels: { enabled: false, style: { colors: ['#E2E8F0'] } },
};
const lineChartFill = { type: 'gradient', gradient: { shadeIntensity: 0.8, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] }};


window.updateDashboard = function(evmResults, project, period) {
    console.log("[DASHBOARD] updateDashboard called. EVM Results:", 
                evmResults ? JSON.parse(JSON.stringify(evmResults)) : null, 
                "Project ID:", project ? project.id : null, 
                "Period ID:", period ? period.id : null);

    const dashboardProjectNameEl = document.getElementById('dashboardProjectName');
    const dashboardStatusDateEl = document.getElementById('dashboardStatusDate');

    if (dashboardProjectNameEl) {
        dashboardProjectNameEl.textContent = project ? (project.projectInfo.projName || 'N/A') : 'N/A';
    }
    if (dashboardStatusDateEl) {
        let periodDisplay = 'N/A';
        if (period && period.id && period.statusDate) {
            try {
                if (!isNaN(new Date(period.statusDate).getTime())) {
                    periodDisplay = `${period.id} (${new Date(period.statusDate).toLocaleDateString()})`;
                } else { periodDisplay = `${period.id} (Invalid Date)`; }
            } catch(e) { periodDisplay = `${period.id} (Date Error)`;}
        }
        dashboardStatusDateEl.textContent = periodDisplay;
    }
    
    if (!evmResults || !evmResults.periodMetrics || !evmResults.cumulativeMetrics || !evmResults.historicalSeries || !project || !period) {
        console.warn("[DASHBOARD] Update called without sufficient data. Clearing/placeholding charts and text.");
        
        if (overallProgressDonutChart && typeof overallProgressDonutChart.destroy === 'function') { overallProgressDonutChart.destroy(); overallProgressDonutChart = null; }
        if (progressDeviationChartInstance && typeof progressDeviationChartInstance.destroy === 'function') { progressDeviationChartInstance.destroy(); progressDeviationChartInstance = null; }
        if (sCurveChartInstance && typeof sCurveChartInstance.destroy === 'function') { sCurveChartInstance.destroy(); sCurveChartInstance = null; }
        if (cpiGaugePeriodChart && typeof cpiGaugePeriodChart.destroy === 'function') { cpiGaugePeriodChart.destroy(); cpiGaugePeriodChart = null; }
        if (spiGaugePeriodChart && typeof spiGaugePeriodChart.destroy === 'function') { spiGaugePeriodChart.destroy(); spiGaugePeriodChart = null; }
        if (kpiTrendChartInstance && typeof kpiTrendChartInstance.destroy === 'function') { kpiTrendChartInstance.destroy(); kpiTrendChartInstance = null; }
        if (varianceChartInstance && typeof varianceChartInstance.destroy === 'function') { varianceChartInstance.destroy(); varianceChartInstance = null; }

        const chartIds = ['overallProgressDonut', 'progressDeviationChart', 'sCurveChart', 'cpiGaugePeriod', 'spiGaugePeriod', 'kpiTrendChart', 'varianceChart'];
        chartIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<p class="no-data-chart">No data available.</p>`;
        });

        document.getElementById('plannedPeriodProgress').textContent = '--';
        document.getElementById('actualPeriodProgress').textContent = '--';
        document.getElementById('dashTotalEV').textContent = '0';
        document.getElementById('dashProjectPercentComplete').textContent = '0.0'; // Clear new element
        document.getElementById('dashSVValue').textContent = '-';
        document.getElementById('dashCVValue').textContent = '-';
        document.getElementById('kpiNarrative').textContent = 'Data insufficient for KPI narrative.';
        return;
    }

    const periodMetrics = evmResults.periodMetrics;
    const cumulativeMetrics = evmResults.cumulativeMetrics;
    const historicalSeries = evmResults.historicalSeries;

    // --- CURRENT PROGRESS Section ---
    const periodPlannedWork_Cost = periodMetrics.PV_Cost; 
    const periodEarnedWork_Cost = periodMetrics.EV_Cost;   
    let periodProgressPercent = 0;
    if (periodPlannedWork_Cost !== null && periodEarnedWork_Cost !== null && isFinite(periodPlannedWork_Cost) && isFinite(periodEarnedWork_Cost)) {
        periodProgressPercent = (periodPlannedWork_Cost > 0 ? (periodEarnedWork_Cost / periodPlannedWork_Cost) * 100 : (periodEarnedWork_Cost > 0 ? 100 : 0) );
    }
    renderOverallProgressDonut(periodProgressPercent, "Period % Cost Complete"); 
    document.getElementById('plannedPeriodProgress').textContent = (periodPlannedWork_Cost !== null && isFinite(periodPlannedWork_Cost)) 
        ? periodPlannedWork_Cost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) : '--';
    document.getElementById('actualPeriodProgress').textContent = (periodEarnedWork_Cost !== null && isFinite(periodEarnedWork_Cost))
        ? periodEarnedWork_Cost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) : '--';
    const periodSPIDeviation_Cost = (periodMetrics.SPI_Cost !== null && isFinite(periodMetrics.SPI_Cost)) ? (periodMetrics.SPI_Cost - 1) * 100 : 0;
    progressDeviationChartInstance = updateOrCreateChart( progressDeviationChartInstance, 'progressDeviationChart', createProgressDeviationOptions([{ period: period.id, deviation: periodSPIDeviation_Cost }]));

    // --- S-Curve Section ---
    const dashTotalEVEl = document.getElementById('dashTotalEV');
    const dashProjectPercentCompleteEl = document.getElementById('dashProjectPercentComplete'); // NEW
    const dashSVValueEl = document.getElementById('dashSVValue');
    const dashCVValueEl = document.getElementById('dashCVValue');

    if (dashTotalEVEl) { dashTotalEVEl.textContent = (cumulativeMetrics.EV_toDate_Cost !== null && isFinite(cumulativeMetrics.EV_toDate_Cost)) ? cumulativeMetrics.EV_toDate_Cost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) : '0'; }
    if (dashProjectPercentCompleteEl) { // NEW
        if (cumulativeMetrics.projectPercentComplete_toDate !== null && isFinite(cumulativeMetrics.projectPercentComplete_toDate)) {
            dashProjectPercentCompleteEl.textContent = cumulativeMetrics.projectPercentComplete_toDate.toFixed(1);
        } else {
            dashProjectPercentCompleteEl.textContent = 'N/A';
        }
    }
    if (dashSVValueEl) { dashSVValueEl.textContent = (cumulativeMetrics.SV_toDate_Cost !== null && isFinite(cumulativeMetrics.SV_toDate_Cost)) ? cumulativeMetrics.SV_toDate_Cost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) : '-';}
    if (dashCVValueEl) { dashCVValueEl.textContent = (cumulativeMetrics.CV_toDate_Cost !== null && isFinite(cumulativeMetrics.CV_toDate_Cost)) ? cumulativeMetrics.CV_toDate_Cost.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0}) : '-';}
    
    renderSCurveChart( historicalSeries.pv || [], historicalSeries.ev || [], historicalSeries.ac || [], historicalSeries.dates || [], cumulativeMetrics.projectBAC_Cost );

    // --- KPIs Section ---
    renderCPIGaugePeriod(periodMetrics.CPI_Cost); 
    renderSPIGaugePeriod(periodMetrics.SPI_Cost);
    updateKPINarrative(periodMetrics.CPI_Cost, periodMetrics.SPI_Cost, "for the current period (cost-based)");
    renderKPITrendChart( historicalSeries.cpi || [], historicalSeries.spi || [], historicalSeries.dates || []);
    renderVarianceChart( historicalSeries.cv || [], historicalSeries.sv || [], historicalSeries.dates || []);

    console.log("[DASHBOARD] Dashboard charts and text updated.");
};


// --- HELPER FUNCTIONS & CHART RENDERING FUNCTIONS ---

function updateOrCreateChart(chartInstance, elId, options, redraw = true, animate = true, updateSync = true) {
    const chartEl = document.getElementById(elId);
    if (!chartEl) {
        console.warn(`[DASHBOARD - HELPER] Chart element '${elId}' not found.`);
        if (chartInstance && typeof chartInstance.destroy === 'function') {
            try { chartInstance.destroy(); } catch (e) { console.error(`[DASHBOARD - HELPER] Error destroying chart for ${elId}:`, e); }
        }
        return null;
    }
    if (chartInstance && typeof chartInstance.updateOptions === 'function' && chartInstance.el && document.body.contains(chartInstance.el)) {
        try {
            chartInstance.updateOptions(options, redraw, animate, updateSync);
        } catch (e) {
            console.error(`[DASHBOARD - HELPER] Error updating chart '${elId}', will recreate:`, e);
            if (typeof chartInstance.destroy === 'function') { try { chartInstance.destroy(); } catch (de) { /* ignore */ } }
            chartInstance = new ApexCharts(chartEl, options);
            try { chartInstance.render(); } catch (re) { console.error(`[DASHBOARD - HELPER] Error rendering recreated chart '${elId}':`, re); chartInstance = null; }
        }
    } else {
        if (chartInstance && typeof chartInstance.destroy === 'function') {
            try { chartInstance.destroy(); } catch (e) { console.error(`[DASHBOARD - HELPER] Error destroying chart for ${elId} before recreate:`, e); }
        }
        chartInstance = new ApexCharts(chartEl, options);
        try { chartInstance.render(); } catch (e) { console.error(`[DASHBOARD - HELPER] Error rendering new chart '${elId}':`, e); chartInstance = null; }
    }
    return chartInstance;
}

function createProgressDeviationOptions(deviationData) {
    const seriesData = (deviationData && deviationData.length > 0 && deviationData[0].deviation !== null && isFinite(deviationData[0].deviation)) ?
                       [parseFloat(deviationData[0].deviation.toFixed(1))] : [0];
    const categories = (deviationData && deviationData.length > 0) ? [deviationData[0].period] : ['N/A'];
    return {
        ...commonChartOptions,
        series: [{ name: 'Period SPI Deviation (%)', data: seriesData }],
        chart: { ...commonChartOptions.chart, type: 'bar', height: 120, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: false, columnWidth: '35%', borderRadius: 4, colors: { ranges: [{ from: -Infinity, to: -0.01, color: '#F56565' }, { from: 0, to: Infinity, color: '#48BB78' }] } } },
        dataLabels: { enabled: true, offsetY: -18, style: {fontSize: '10px', colors: ["#E2E8F0"]}, formatter: v => `${v}%` },
        xaxis: { categories: categories, labels: { show: false }, axisBorder: {show:false}, axisTicks:{show:false} },
        yaxis: { labels: { show: false }, min: -25, max: 25, axisBorder: {show:false}, axisTicks:{show:false}}, 
        tooltip: { enabled: true, y: { formatter: function(val) { return val !== null && isFinite(val) ? val.toFixed(1) + "%" : 'N/A'; } } }
    };
}

function renderOverallProgressDonut(progressPercent, title = "Progress") {
    const chartEl = document.getElementById('overallProgressDonut');
    if (overallProgressDonutChart && typeof overallProgressDonutChart.destroy === 'function') {
        overallProgressDonutChart.destroy();
        overallProgressDonutChart = null;
    }
    if(chartEl) {
        const val = (progressPercent !== null && isFinite(progressPercent)) ? parseFloat(progressPercent.toFixed(1)) : 0;
        const options = {
            series: [val],
            chart: { ...commonChartOptions.chart, type: 'radialBar', height: 180, sparkline: { enabled: true } },
            plotOptions: {
                radialBar: {
                    hollow: { margin: 5, size: '60%' }, track: { background: "#4A5568" },
                    dataLabels: {
                        name: { show: true, offsetY: 16, fontSize: '11px', color: '#A0AEC0', formatter: function() { return title; } },
                        value: { offsetY: -18, fontSize: '22px', color: '#E2E8F0', fontWeight: 'bold', formatter: function (v) { return v + "%"; }}
                    }
                }
            },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9, colorStops: [ { offset: 0, color: "#4299E1", opacity: 1}, { offset: 100, color: "#3182CE", opacity: 1}] }}, 
            stroke: { lineCap: 'round' }, colors: ['#4299E1']
        };
        overallProgressDonutChart = new ApexCharts(chartEl, options); 
        overallProgressDonutChart.render(); 
    }
}

function renderGauge(elId, existingChartInstance, seriesData, title, goodThreshold = 1.0) {
    const chartEl = document.getElementById(elId);
    let chartInstance = existingChartInstance;

    if (chartInstance && typeof chartInstance.destroy === 'function') {
        chartInstance.destroy(); 
        chartInstance = null; 
    }
    if (chartEl) {
        const val = (seriesData !== null && isFinite(seriesData)) ? parseFloat(seriesData.toFixed(2)) : 0;
        const color = val === 0 ? '#A0AEC0' : (val >= goodThreshold ? '#48BB78' : '#F56565');
        const gradientColor = val === 0 ? '#718096' : (val >= goodThreshold ? '#68D391' : '#FC8181');
        const options = {
            series: [val],
            chart: { ...commonChartOptions.chart, type: 'radialBar', height: 180, offsetY: -5 },
            plotOptions: { radialBar: { startAngle: -125, endAngle: 125, hollow: { size: '65%' }, track: { background: "#374151"}, dataLabels: { name: { offsetY: 20, fontSize: '13px', color: '#CBD5E0', formatter: function() { return title; }}, value: { offsetY: -15, fontSize: '22px', color: '#E2E8F0', fontWeight: 'bold', formatter: function (v) { return v !== null && isFinite(v) ? v.toFixed(2) : 'N/A'; }} } } },
            fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', shadeIntensity: 0.5, gradientToColors: [gradientColor], inverseColors: true, opacityFrom: 1, opacityTo: 1, stops: [0, 100] }}, 
            stroke: { lineCap: 'round' }, colors: [color],
        };
        chartInstance = new ApexCharts(chartEl, options);
        chartInstance.render();
    } else { chartInstance = null; }
    return chartInstance;
}

function renderCPIGaugePeriod(cpiPeriod_Cost) { cpiGaugePeriodChart = renderGauge('cpiGaugePeriod', cpiGaugePeriodChart, cpiPeriod_Cost, 'CPI (Period - Cost)'); }
function renderSPIGaugePeriod(spiPeriod_Cost) { spiGaugePeriodChart = renderGauge('spiGaugePeriod', spiGaugePeriodChart, spiPeriod_Cost, 'SPI (Period - Cost)'); }

function updateKPINarrative(cpi_cost, spi_cost, contextText = "") { /* ... (same as before) ... */
    const narrativeEl = document.getElementById('kpiNarrative');
    if(!narrativeEl) return;
    let text = `Performance KPIs ${contextText} show that the selection `;
    const cpiVal = (cpi_cost !== null && isFinite(cpi_cost)) ? cpi_cost : 1.0;
    const spiVal = (spi_cost !== null && isFinite(spi_cost)) ? spi_cost : 1.0;
    if (cpiVal >= 0.98 && spiVal >= 0.98) text += "is <span class='positive-text'>generally on track or better</span>.";
    else if (cpiVal < 0.95 && spiVal < 0.95) text += "is <span class='negative-text'>significantly behind schedule and over budget</span>.";
    else if (cpiVal >= 0.98 && spiVal < 0.95) text += "is <span class='neutral-text'>under budget (or on budget)</span> but <span class='negative-text'>behind schedule</span>.";
    else if (cpiVal < 0.95 && spiVal >= 0.98) text += "is <span class='negative-text'>over budget</span> but <span class='positive-text'>ahead of schedule (or on schedule)</span>.";
    else text += "shows mixed performance or requires closer review."
    text += ` (CPI Cost: ${cpiVal.toFixed(2)}, SPI Cost: ${spiVal.toFixed(2)})`;
    narrativeEl.innerHTML = text;
}

function renderSCurveChart(pvSeriesData, evSeriesData, acSeriesData, dateSeries, projectBAC_Cost) {
    if (!dateSeries || dateSeries.length === 0) { 
        if (sCurveChartInstance && typeof sCurveChartInstance.destroy === 'function') sCurveChartInstance.destroy(); 
        sCurveChartInstance = null; 
        const el = document.getElementById('sCurveChart'); if (el) el.innerHTML = '<p class="no-data-chart">Not enough historical data for S-Curve.</p>';
        return;
    }
    const align = (s) => dateSeries.map((_, i) => (s && s[i] !== undefined && s[i] !== null) ? s[i] : null);
    const series = [
        { name: 'PV (Cost Cum.)', data: align(pvSeriesData).map((val, idx) => ({ x: new Date(dateSeries[idx]).getTime(), y: val })), type: 'area' },
        { name: 'EV (Cost Cum.)', data: align(evSeriesData).map((val, idx) => ({ x: new Date(dateSeries[idx]).getTime(), y: val })), type: 'line' },
        { name: 'AC (Cum.)', data: align(acSeriesData).map((val, idx) => ({ x: new Date(dateSeries[idx]).getTime(), y: val })), type: 'line' }
    ];
    if (projectBAC_Cost > 0 && dateSeries.length > 0) {
        series.push({ name: 'BAC (Cost)', type: 'line', data: [ { x: new Date(dateSeries[0]).getTime(), y: projectBAC_Cost }, { x: new Date(dateSeries[dateSeries.length - 1]).getTime(), y: projectBAC_Cost } ] });
    }
    const options = {
        ...commonChartOptions, series: series,
        chart: { ...commonChartOptions.chart, type: 'line', height: 320, stacked: false },
        colors: ['#A0AEC0', '#63B3ED', '#F56565', '#48BB78'], 
        stroke: { width: [2, 3, 3, 2], curve: 'smooth', dashArray: [5, 0, 0, 8] }, 
        fill: { type: ['gradient', 'solid', 'solid', 'solid'], opacity: [0.5, 1, 1, 1], gradient: { shadeIntensity: 0.7, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 95, 100] }},
        xaxis: { type: 'datetime', tickAmount: Math.min(6, dateSeries.length), labels:{format: 'MMM yy'} },
        yaxis: { title: { text: 'Cumulative Value (Cost-Based)' }, forceNiceScale: true },
        markers: { size: [0, 4, 4, 0], hover: {sizeOffset: 2}}, legend: { position: 'bottom', offsetY: 0 },
        tooltip: { // Focused tooltip for S-Curve
            theme: 'dark', shared: false, intersect: true,
            x: { format: 'dd MMM yy' },
            y: {
                formatter: function(value, { seriesIndex, w }) {
                    if (value === null || value === undefined) return "N/A";
                    if (w.globals.seriesNames[seriesIndex] === 'BAC (Cost)') {
                        return projectBAC_Cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                    }
                    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                },
                title: { formatter: function (seriesName) { return seriesName + ':'; } }
            }
        }
    };
    sCurveChartInstance = updateOrCreateChart(sCurveChartInstance, 'sCurveChart', options);
}

function renderKPITrendChart(cpiSeriesData, spiSeriesData, dateSeries) { /* ... (as before, using updateOrCreateChart) ... */
    if (!dateSeries || dateSeries.length === 0) { 
        if (kpiTrendChartInstance && typeof kpiTrendChartInstance.destroy === 'function') kpiTrendChartInstance.destroy(); 
        kpiTrendChartInstance = null; 
        const el = document.getElementById('kpiTrendChart'); if (el) el.innerHTML = '<p class="no-data-chart">Not enough historical data for KPI Trends.</p>';
        return;
    }
    const align = (s) => dateSeries.map((_, i) => (s && s[i] !== undefined && s[i] !== null && isFinite(s[i])) ? s[i] : null);
    const options = {
        ...commonChartOptions,
        chart: { ...commonChartOptions.chart, type: 'line', height: 250, toolbar: { show: true, tools: {download:true}}},
        stroke: { width: 2, curve: 'smooth' }, colors: ['#4299E1', '#9F7AEA'],
        xaxis: { type: 'datetime', categories: dateSeries.map(d=>new Date(d).getTime()), tickAmount: Math.min(6,dateSeries.length), labels:{format:'MMM yy'} },
        yaxis: { title: { text: 'Index Value' }, min: 0.5, max: 1.5, tickAmount: 5, labels: { formatter: v => (v !== null && isFinite(v)) ? v.toFixed(1) : '' } },
        markers: { size: 3, hover: {size: 5}}, legend: { position: 'top', horizontalAlign: 'right', offsetY: -5 },
        tooltip: { 
            x: { format: 'dd MMM yy' }, // Ensure date format for x-axis in tooltip
            y: { formatter: function (val) { return (val !== null && isFinite(val)) ? val.toFixed(2) : 'N/A' } } 
        },
        series: [
            { name: 'CPI (Cost Cum.)', data: align(cpiSeriesData).map((val, idx) => ({ x: new Date(dateSeries[idx]).getTime(), y: val })) },
            { name: 'SPI (Cost Cum.)', data: align(spiSeriesData).map((val, idx) => ({ x: new Date(dateSeries[idx]).getTime(), y: val })) }
        ]
    };
    kpiTrendChartInstance = updateOrCreateChart(kpiTrendChartInstance, 'kpiTrendChart', options);
}

function renderVarianceChart(cvSeriesData, svSeriesData, dateSeries) { /* ... (as before, using updateOrCreateChart) ... */
    if (!dateSeries || dateSeries.length === 0) { 
        if (varianceChartInstance && typeof varianceChartInstance.destroy === 'function') varianceChartInstance.destroy(); 
        varianceChartInstance = null; 
        const el = document.getElementById('varianceChart'); if (el) el.innerHTML = '<p class="no-data-chart">Not enough historical data for Variances.</p>';
        return;
    }
    const align = (s) => dateSeries.map((_, i) => (s && s[i] !== undefined && s[i] !== null) ? s[i] : null);
    const options = {
        ...commonChartOptions,
        chart: { ...commonChartOptions.chart, type: 'area', height: 250, stacked: false },
        colors: ['#48BB78', '#F6AD55'], dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2 },
        fill: lineChartFill,
        xaxis: { type: 'datetime', categories: dateSeries.map(d=>new Date(d).getTime()), tickAmount: Math.min(6,dateSeries.length), labels:{format:'MMM yy'} },
        yaxis: { title: { text: 'Variance Value (Cost-Based)' }, forceNiceScale: true }, markers: { size: 0 },
        annotations: { yaxis: [{ y: 0, borderColor: '#A0AEC0', borderWidth:1, strokeDashArray: 3, label: { borderColor: '#A0AEC0', style: { color: '#fff', background: '#A0AEC0', fontSize: '10px', padding: {left: 4, right: 4, top:1, bottom:1}}, text: 'Baseline' }}]},
        tooltip: { x: { format: 'dd MMM yyyy' }},
        series: [
            { name: 'Cost Variance (Cost Cum.)', data: align(cvSeriesData).map((val, idx) => ({ x: new Date(dateSeries[idx]).getTime(), y: val })) },
            { name: 'Schedule Variance (Cost Cum.)', data: align(svSeriesData).map((val, idx) => ({ x: new Date(dateSeries[idx]).getTime(), y: val })) }
        ]
    };
    varianceChartInstance = updateOrCreateChart(varianceChartInstance, 'varianceChart', options);
}