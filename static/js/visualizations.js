// Visualizations JavaScript

// Color palette for charts (dark mode optimized)
const colorPalette = [
    '#64FFDA', // Primary accent
    '#BB86FC', // Secondary accent
    '#03DAC5', // Success
    '#CF6679', // Error
    '#FFD600', // Warning
    '#4ECDC4', // Teal
    '#FF6B6B', // Red
    '#FFA69E', // Peach
    '#C2CAE8', // Lavender
    '#8A2BE2'  // Blue violet
];

// Chart.js global configuration
function configureChartJS() {
    Chart.defaults.color = '#B3B3B3';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.font.family = "'Roboto', sans-serif";
    
    // Custom tooltip style
    Chart.defaults.plugins.tooltip.backgroundColor = '#2D2D2D';
    Chart.defaults.plugins.tooltip.titleColor = '#FFFFFF';
    Chart.defaults.plugins.tooltip.bodyColor = '#B3B3B3';
    Chart.defaults.plugins.tooltip.borderColor = '#64FFDA';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    
    // Custom legend style
    Chart.defaults.plugins.legend.labels.color = '#B3B3B3';
    Chart.defaults.plugins.legend.labels.font = {
        family: "'Roboto', sans-serif",
        size: 12
    };
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    configureChartJS();
    
    // Initialize visualizations if relevant containers exist
    initSalesVisualizations();
    initAssociationVisualizations();
    initForecastVisualizations();
});

// Sales data visualization
function initSalesVisualizations() {
    const salesChartCanvas = document.getElementById('sales-chart');
    if (salesChartCanvas) {
        // Get sales data from data attribute
        const salesData = JSON.parse(salesChartCanvas.dataset.sales || '{}');
        
        if (salesData && salesData.top_products) {
            createProductSalesChart(salesChartCanvas, salesData.top_products);
        }
    }
    
    const salesTimeChartCanvas = document.getElementById('sales-time-chart');
    if (salesTimeChartCanvas) {
        // Get sales over time data from data attribute
        const salesTimeData = JSON.parse(salesTimeChartCanvas.dataset.salesTime || '{}');
        
        if (salesTimeData) {
            createSalesOverTimeChart(salesTimeChartCanvas, salesTimeData);
        }
    }
}

// Create product sales chart (bar chart)
function createProductSalesChart(canvas, data) {
    if (!data) return;
    
    const productNames = Object.keys(data);
    const salesValues = Object.values(data);
    
    // Limit to top 10 products if more exist
    const limit = 10;
    const labels = productNames.slice(0, limit);
    const values = salesValues.slice(0, limit);
    
    const chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales Quantity',
                data: values,
                backgroundColor: values.map((_, i) => colorPalette[i % colorPalette.length]),
                borderColor: values.map((_, i) => colorPalette[i % colorPalette.length]),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Top Products by Sales Quantity',
                    color: '#FFFFFF',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

// Create sales over time chart (line chart)
function createSalesOverTimeChart(canvas, data) {
    if (!data || !data.length) return;
    
    const dates = data.map(item => item.Date);
    const quantities = data.map(item => item.Total_Quantity);
    const transactions = data.map(item => item.Transaction_Count);
    
    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Total Quantity',
                    data: quantities,
                    backgroundColor: colorPalette[0] + '33', // 20% opacity
                    borderColor: colorPalette[0],
                    borderWidth: 2,
                    pointBackgroundColor: colorPalette[0],
                    pointBorderColor: '#1E1E1E',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Transaction Count',
                    data: transactions,
                    backgroundColor: colorPalette[1] + '33', // 20% opacity
                    borderColor: colorPalette[1],
                    borderWidth: 2,
                    pointBackgroundColor: colorPalette[1],
                    pointBorderColor: '#1E1E1E',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Total Quantity',
                        color: colorPalette[0]
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Transaction Count',
                        color: colorPalette[1]
                    },
                    grid: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sales Over Time',
                    color: '#FFFFFF',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Association rule visualizations
function initAssociationVisualizations() {
    const associationHeatmapCanvas = document.getElementById('association-heatmap');
    if (associationHeatmapCanvas) {
        // Get association rules data from data attribute
        const rulesData = JSON.parse(associationHeatmapCanvas.dataset.rules || '[]');
        
        if (rulesData && rulesData.length > 0) {
            createAssociationHeatmap(associationHeatmapCanvas, rulesData);
        }
    }
    
    const associationNetworkDiv = document.getElementById('association-network');
    if (associationNetworkDiv) {
        // Get association rules data from data attribute
        const rulesData = JSON.parse(associationNetworkDiv.dataset.rules || '[]');
        
        if (rulesData && rulesData.length > 0) {
            createAssociationNetwork(associationNetworkDiv, rulesData);
        }
    }
    
    const scatterPlotCanvas = document.getElementById('scatter-plot');
    if (scatterPlotCanvas) {
        // Get association rules data from data attribute
        const rulesData = JSON.parse(scatterPlotCanvas.dataset.rules || '[]');
        
        if (rulesData && rulesData.length > 0) {
            createScatterPlot(scatterPlotCanvas, rulesData);
        }
    }
}

// Create association heatmap
function createAssociationHeatmap(canvas, rules) {
    if (!rules || rules.length === 0) return;
    
    // Extract unique products from rules
    const products = new Set();
    rules.forEach(rule => {
        rule.antecedents.forEach(product => products.add(product));
        rule.consequents.forEach(product => products.add(product));
    });
    
    const productArray = Array.from(products);
    
    // Create matrix data
    const matrixData = Array(productArray.length).fill(0).map(() => Array(productArray.length).fill(0));
    
    // Fill matrix with lift values
    rules.forEach(rule => {
        rule.antecedents.forEach(ant => {
            const antIndex = productArray.indexOf(ant);
            
            rule.consequents.forEach(cons => {
                const consIndex = productArray.indexOf(cons);
                
                if (antIndex !== -1 && consIndex !== -1) {
                    matrixData[antIndex][consIndex] = rule.lift;
                }
            });
        });
    });
    
    // Create heatmap using Chart.js matrix
    const chart = new Chart(canvas, {
        type: 'matrix',
        data: {
            datasets: [{
                label: 'Association Lift',
                data: matrixData.flatMap((row, i) => 
                    row.map((value, j) => ({
                        x: j,
                        y: i,
                        v: value
                    }))
                ),
                backgroundColor(context) {
                    const value = context.dataset.data[context.dataIndex].v;
                    
                    if (value === 0) return 'rgba(0, 0, 0, 0.1)';
                    
                    const alpha = Math.min(value / 5, 1);  // Normalize lift value
                    return `rgba(100, 255, 218, ${alpha})`;
                },
                borderColor: '#1E1E1E',
                borderWidth: 1,
                width: ({chart}) => (chart.chartArea || {}).width / productArray.length - 1,
                height: ({chart}) => (chart.chartArea || {}).height / productArray.length - 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'category',
                    labels: productArray,
                    offset: true,
                    ticks: {
                        display: productArray.length <= 20  // Only show labels if there aren't too many
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    type: 'category',
                    labels: productArray,
                    offset: true,
                    ticks: {
                        display: productArray.length <= 20  // Only show labels if there aren't too many
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title() {
                            return 'Product Association';
                        },
                        label(context) {
                            const v = context.dataset.data[context.dataIndex];
                            return [
                                `Antecedent: ${productArray[v.y]}`,
                                `Consequent: ${productArray[v.x]}`,
                                `Lift: ${v.v.toFixed(2)}`
                            ];
                        }
                    }
                },
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Product Association Heatmap',
                    color: '#FFFFFF',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Create scatter plot for confidence vs support
function createScatterPlot(canvas, rules) {
    if (!rules || rules.length === 0) return;
    
    // Extract data for scatter plot
    const dataPoints = rules.map(rule => ({
        x: rule.support,
        y: rule.confidence,
        r: rule.lift * 5,  // Size based on lift
        rule: `${rule.antecedents.join(', ')} -> ${rule.consequents.join(', ')}`
    }));
    
    const chart = new Chart(canvas, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Association Rules',
                data: dataPoints,
                backgroundColor: dataPoints.map((_, i) => colorPalette[i % colorPalette.length] + '80'),  // 50% opacity
                borderColor: dataPoints.map((_, i) => colorPalette[i % colorPalette.length]),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Support',
                        color: '#B3B3B3'
                    },
                    min: 0,
                    max: Math.max(...dataPoints.map(d => d.x)) * 1.1,  // Add 10% padding
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Confidence',
                        color: '#B3B3B3'
                    },
                    min: 0,
                    max: 1,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title(tooltipItems) {
                            return tooltipItems[0].raw.rule;
                        },
                        label(context) {
                            const data = context.raw;
                            return [
                                `Support: ${data.x.toFixed(3)}`,
                                `Confidence: ${data.y.toFixed(3)}`,
                                `Lift: ${(data.r / 5).toFixed(3)}`
                            ];
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Association Rules: Support vs Confidence',
                    color: '#FFFFFF',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Create force-directed network graph for association rules
function createAssociationNetwork(container, rules) {
    if (!rules || rules.length === 0) return;

    // First, check if D3.js is available
    if (!window.d3) {
        console.error('D3.js is required for network visualization');
        container.innerHTML = '<div class="alert alert-warning">D3.js library is required for this visualization.</div>';
        return;
    }
    
    // Prepare data for network visualization
    const nodes = new Map();
    const links = [];
    
    // Add all products as nodes
    rules.forEach(rule => {
        rule.antecedents.forEach(product => {
            if (!nodes.has(product)) {
                nodes.set(product, { id: product, group: 1 });
            }
        });
        
        rule.consequents.forEach(product => {
            if (!nodes.has(product)) {
                nodes.set(product, { id: product, group: 2 });
            }
        });
        
        // Add links between antecedents and consequents
        rule.antecedents.forEach(source => {
            rule.consequents.forEach(target => {
                links.push({
                    source,
                    target,
                    value: rule.lift,
                    confidence: rule.confidence,
                    support: rule.support
                });
            });
        });
    });
    
    // Convert nodes map to array
    const nodesArray = Array.from(nodes.values());
    
    // Set up the SVG container
    const width = container.clientWidth;
    const height = Math.max(500, container.clientHeight);
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('style', 'max-width: 100%; height: auto;');
    
    // Create a color scale
    const colorScale = d3.scaleOrdinal()
        .domain([1, 2])
        .range([colorPalette[0], colorPalette[1]]);
    
    // Create a force simulation
    const simulation = d3.forceSimulation(nodesArray)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));
    
    // Create the link lines
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#888')
        .attr('stroke-opacity', d => Math.min(d.value / 5, 1))  // Use lift to determine opacity
        .attr('stroke-width', d => Math.max(Math.sqrt(d.value) * 2, 1));  // Use lift to determine width
    
    // Add arrowheads to links
    svg.append('defs').selectAll('marker')
        .data(['end'])
        .join('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', '#888')
        .attr('d', 'M0,-5L10,0L0,5');
    
    link.attr('marker-end', 'url(#arrow)');
    
    // Create the node circles
    const node = svg.append('g')
        .selectAll('g')
        .data(nodesArray)
        .join('g')
        .call(drag(simulation));
    
    // Add circles for nodes
    node.append('circle')
        .attr('r', 10)
        .attr('fill', d => colorScale(d.group))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
    
    // Add text labels to nodes
    node.append('text')
        .attr('x', 12)
        .attr('y', 4)
        .text(d => d.id)
        .attr('fill', '#fff')
        .style('font-size', '12px')
        .style('pointer-events', 'none');
    
    // Add tooltips for links
    link.append('title')
        .text(d => `${d.source.id} → ${d.target.id}\nLift: ${d.value.toFixed(3)}\nConfidence: ${d.confidence.toFixed(3)}\nSupport: ${d.support.toFixed(3)}`);
    
    // Add tooltips for nodes
    node.append('title')
        .text(d => d.id);
    
    // Update positions on each tick of the simulation
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Drag behavior function
    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
}

// Forecast visualizations
function initForecastVisualizations() {
    const forecastChartCanvas = document.getElementById('forecast-chart');
    if (forecastChartCanvas) {
        // Get forecast data from data attribute
        const forecastData = JSON.parse(forecastChartCanvas.dataset.forecast || '{}');
        
        if (Object.keys(forecastData).length > 0) {
            createForecastChart(forecastChartCanvas, forecastData);
        }
    }
}

// Create forecast chart (line chart)
function createForecastChart(canvas, forecastData) {
    if (!forecastData || Object.keys(forecastData).length === 0) return;
    
    // Get all dates from the first product (assuming all products have the same dates)
    const firstProduct = Object.keys(forecastData)[0];
    const dates = forecastData[firstProduct].map(item => item.date);
    
    // Prepare datasets for each product
    const datasets = Object.keys(forecastData).map((product, index) => {
        const color = colorPalette[index % colorPalette.length];
        
        return {
            label: product,
            data: forecastData[product].map(item => item.quantity),
            backgroundColor: color + '33',  // 20% opacity
            borderColor: color,
            borderWidth: 2,
            pointBackgroundColor: color,
            pointBorderColor: '#1E1E1E',
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false,
            tension: 0.4
        };
    });
    
    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Forecasted Quantity',
                        color: '#B3B3B3'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Demand Forecast',
                    color: '#FFFFFF',
                    font: {
                        size: 16
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy'
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy'
                    }
                }
            }
        }
    });
    
    // Add reset zoom button if zoom plugin is available
    if (chart.options.plugins.zoom) {
        const resetZoomBtn = document.createElement('button');
        resetZoomBtn.className = 'btn btn-sm btn-outline-secondary mt-2';
        resetZoomBtn.innerText = 'Reset Zoom';
        resetZoomBtn.addEventListener('click', () => {
            chart.resetZoom();
        });
        
        canvas.parentNode.insertBefore(resetZoomBtn, canvas.nextSibling);
    }
}

// Function to update charts when theme changes
window.updateChartsTheme = function(isLightTheme) {
    // Update Chart.js defaults
    if (isLightTheme) {
        Chart.defaults.color = '#333333';
        Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
    } else {
        Chart.defaults.color = '#B3B3B3';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    }
    
    // Update all charts
    Chart.instances.forEach(chart => {
        chart.update();
    });
};
