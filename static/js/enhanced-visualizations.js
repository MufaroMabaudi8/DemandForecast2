// Enhanced visualizations for the demand forecasting system
// This file contains improved chart implementations for association analysis

// Color palette for gradient and multi-color visualizations
const colorGradients = {
  // Gradient for lift values (red = high association)
  heatmap: [
    { percent: 0, color: { r: 0, g: 100, b: 160 } },   // Low (blue)
    { percent: 0.25, color: { r: 50, g: 150, b: 200 } }, // Blue-cyan
    { percent: 0.5, color: { r: 100, g: 200, b: 100 } }, // Green
    { percent: 0.75, color: { r: 255, g: 255, b: 0 } },  // Yellow
    { percent: 1, color: { r: 255, g: 0, b: 0 } }      // High (red)
  ]
};

// Helper function to interpolate colors for gradient
function getColorForValue(value, min, max, gradientStops) {
  const normalizedValue = (value - min) / (max - min);
  
  // Find the two closest color stops
  let lowerStop = gradientStops[0];
  let upperStop = gradientStops[gradientStops.length - 1];
  
  for (let i = 0; i < gradientStops.length - 1; i++) {
    if (normalizedValue >= gradientStops[i].percent && normalizedValue <= gradientStops[i + 1].percent) {
      lowerStop = gradientStops[i];
      upperStop = gradientStops[i + 1];
      break;
    }
  }
  
  // Calculate the position between the two stops
  const range = upperStop.percent - lowerStop.percent;
  const rangePct = range === 0 ? 0 : (normalizedValue - lowerStop.percent) / range;
  
  // Interpolate RGB values
  const r = Math.floor(lowerStop.color.r + (upperStop.color.r - lowerStop.color.r) * rangePct);
  const g = Math.floor(lowerStop.color.g + (upperStop.color.g - lowerStop.color.g) * rangePct);
  const b = Math.floor(lowerStop.color.b + (upperStop.color.b - lowerStop.color.b) * rangePct);
  
  return `rgba(${r}, ${g}, ${b}, 0.85)`;
}

// Create an enhanced association heatmap
function createEnhancedHeatmap(canvas, rules) {
  if (!rules || rules.length === 0) {
    console.warn("No association rules provided for heatmap");
    canvas.parentNode.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>
        No association rules available for visualization.
      </div>`;
    return null;
  }
  
  console.log("Creating enhanced heatmap with", rules.length, "rules");
  
  try {
    // Extract unique products (limit to top products for readability)
    const maxProducts = Math.min(12, Math.floor(Math.sqrt(rules.length * 2))); 
    const productFrequency = new Map();
    
    // Count product frequency
    rules.forEach(rule => {
      // Handle both array and string formats for antecedents/consequents
      const antecedents = Array.isArray(rule.antecedents) ? rule.antecedents : [rule.antecedents];
      const consequents = Array.isArray(rule.consequents) ? rule.consequents : [rule.consequents];
      
      [...antecedents, ...consequents].forEach(product => {
        productFrequency.set(product, (productFrequency.get(product) || 0) + 1);
      });
    });
    
    // Get top products by frequency
    const topProducts = Array.from(productFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxProducts)
      .map(entry => entry[0]);
    
    // Create matrix data
    const matrixData = [];
    const liftValues = [];
    
    // For each product pair, calculate the best lift
    for (let i = 0; i < topProducts.length; i++) {
      for (let j = 0; j < topProducts.length; j++) {
        if (i !== j) { // Exclude self-associations
          const antecedent = topProducts[i];
          const consequent = topProducts[j];
          
          // Find rules with this relationship
          const matchingRules = rules.filter(rule => 
            rule.antecedents.includes(antecedent) && 
            rule.consequents.includes(consequent)
          );
          
          if (matchingRules.length > 0) {
            // Find the rule with the highest lift
            const bestRule = matchingRules.reduce(
              (best, current) => current.lift > best.lift ? current : best, 
              matchingRules[0]
            );
            
            matrixData.push({
              x: j,
              y: i,
              v: bestRule.lift,
              support: bestRule.support,
              confidence: bestRule.confidence
            });
            
            liftValues.push(bestRule.lift);
          }
        }
      }
    }
    
    // Min/max lift values for color scaling
    const minLift = Math.min(...liftValues);
    const maxLift = Math.max(...liftValues);
    
    // Show message if no relationships found
    if (matrixData.length === 0) {
      canvas.parentNode.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>
          No significant product associations found with current thresholds.
        </div>`;
      return;
    }
    
    // Create the heatmap chart
    const chart = new Chart(canvas, {
      type: 'matrix',
      data: {
        datasets: [{
          label: 'Association Strength (Lift)',
          data: matrixData,
          backgroundColor(context) {
            const value = context.dataset.data[context.dataIndex].v;
            return getColorForValue(value, minLift, maxLift, colorGradients.heatmap);
          },
          borderWidth: 1,
          borderColor: '#333'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',
            position: 'top',
            labels: topProducts,
            offset: true,
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: false,
              font: {
                size: 10
              }
            },
            grid: {
              display: false
            },
            title: {
              display: true,
              text: 'Consequent Products',
              font: {
                weight: 'bold'
              }
            }
          },
          y: {
            type: 'category',
            position: 'left',
            labels: topProducts,
            offset: true,
            ticks: {
              font: {
                size: 10
              }
            },
            grid: {
              display: false
            },
            title: {
              display: true,
              text: 'Antecedent Products',
              font: {
                weight: 'bold'
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title() {
                return 'Product Association';
              },
              label(context) {
                const data = context.dataset.data[context.dataIndex];
                const antecedent = topProducts[data.y];
                const consequent = topProducts[data.x];
                
                return [
                  `If customer buys: ${antecedent}`,
                  `They likely buy: ${consequent}`,
                  `Lift: ${data.v.toFixed(2)}`,
                  `Support: ${(data.support * 100).toFixed(1)}%`,
                  `Confidence: ${(data.confidence * 100).toFixed(1)}%`,
                  `${data.v > 1.5 ? '🔥 Strong association' : 
                    data.v > 1 ? '✅ Positive association' : 
                    data.v < 1 ? '⚠️ Negative association' : 
                    '➖ Neutral association'}`
                ];
              }
            },
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            padding: 10,
            cornerRadius: 6
          }
        }
      }
    });
    
    // Add a legend below the chart
    const legendContainer = document.createElement('div');
    legendContainer.className = 'heatmap-legend mt-3';
    legendContainer.style.display = 'flex';
    legendContainer.style.justifyContent = 'center';
    legendContainer.style.alignItems = 'center';
    legendContainer.style.flexWrap = 'wrap';
    
    // Create gradient legend
    const gradientContainer = document.createElement('div');
    gradientContainer.style.width = '280px';
    gradientContainer.style.height = '20px';
    gradientContainer.style.margin = '0 15px';
    gradientContainer.style.background = 'linear-gradient(to right, rgba(0,100,160,0.85), rgba(50,150,200,0.85), rgba(100,200,100,0.85), rgba(255,255,0,0.85), rgba(255,0,0,0.85))';
    gradientContainer.style.borderRadius = '4px';
    
    // Add text labels
    const minLabel = document.createElement('div');
    minLabel.textContent = `Weak (${minLift.toFixed(1)})`;
    minLabel.style.fontSize = '12px';
    
    const maxLabel = document.createElement('div');
    maxLabel.textContent = `Strong (${maxLift.toFixed(1)})`;
    maxLabel.style.fontSize = '12px';
    
    const infoLabel = document.createElement('div');
    infoLabel.innerHTML = '<small>Association Strength (Lift) - Darker red indicates stronger product relationships</small>';
    infoLabel.style.width = '100%';
    infoLabel.style.textAlign = 'center';
    infoLabel.style.marginTop = '5px';
    
    // Add elements to container
    legendContainer.appendChild(minLabel);
    legendContainer.appendChild(gradientContainer);
    legendContainer.appendChild(maxLabel);
    legendContainer.appendChild(infoLabel);
    
    // Add legend to document
    canvas.parentNode.appendChild(legendContainer);
    
  } catch (error) {
    console.error("Error creating enhanced association heatmap:", error);
    canvas.parentNode.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>
        Error rendering association heatmap: ${error.message}
      </div>`;
  }
}

// Enhanced Product Sales Chart (Bar Chart)
function createEnhancedProductSalesChart(canvas, salesData) {
  if (!salesData) {
    console.warn("No sales data provided for product chart");
    canvas.parentNode.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>
        No product sales data available for visualization.
      </div>`;
    return;
  }
  
  try {
    let parsedData = salesData;
    if (typeof salesData === 'string') {
      parsedData = JSON.parse(salesData);
    }
    
    // Extract product names and quantities from top_products
    const topProducts = parsedData.top_products || {};
    const productNames = Object.keys(topProducts).slice(0, 10); // Limit to top 10
    const quantities = Object.values(topProducts).slice(0, 10);
    
    if (productNames.length === 0) {
      canvas.parentNode.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>
          No product sales data available for visualization.
        </div>`;
      return null;
    }
    
    // Create a gradient for the bars
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(64, 192, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(64, 192, 255, 0.2)');
    
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: productNames,
        datasets: [{
          label: 'Sales Volume',
          data: quantities,
          backgroundColor: gradient,
          borderColor: 'rgba(64, 192, 255, 1)',
          borderWidth: 1,
          borderRadius: 4,
          barThickness: 'flex',
          maxBarThickness: 35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bar chart for better product name display
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            title: {
              display: true,
              text: 'Quantity Sold',
              font: {
                weight: 'bold'
              }
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              weight: 'bold'
            },
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                return `Quantity Sold: ${context.formattedValue}`;
              }
            }
          }
        }
      }
    });
    return chart;
  } catch (error) {
    console.error("Error creating product sales chart:", error);
    canvas.parentNode.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>
        Error rendering product chart: ${error.message}
      </div>`;
    return null;
  }
}

// Enhanced Sales Over Time Chart (Line Chart)
function createEnhancedSalesOverTimeChart(canvas, salesData) {
  if (!salesData) {
    console.warn("No sales data provided for time series chart");
    canvas.parentNode.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>
        No time series data available for visualization.
      </div>`;
    return;
  }
  
  try {
    let parsedData = salesData;
    if (typeof salesData === 'string') {
      parsedData = JSON.parse(salesData);
    }
    
    // Extract time series data
    const salesOverTime = parsedData.sales_over_time || [];
    
    if (salesOverTime.length === 0) {
      canvas.parentNode.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>
          No time series data available for visualization.
        </div>`;
      return null;
    }
    
    // Extract dates and values
    const dates = salesOverTime.map(item => item.Date);
    const quantities = salesOverTime.map(item => item.Total_Quantity);
    const transactions = salesOverTime.map(item => item.Transaction_Count);
    
    // Create gradients for the line areas
    const ctx = canvas.getContext('2d');
    
    const quantityGradient = ctx.createLinearGradient(0, 0, 0, 300);
    quantityGradient.addColorStop(0, 'rgba(113, 93, 255, 0.6)');
    quantityGradient.addColorStop(1, 'rgba(113, 93, 255, 0.1)');
    
    const transactionGradient = ctx.createLinearGradient(0, 0, 0, 300);
    transactionGradient.addColorStop(0, 'rgba(255, 166, 0, 0.6)');
    transactionGradient.addColorStop(1, 'rgba(255, 166, 0, 0.1)');
    
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Total Quantity',
            data: quantities,
            backgroundColor: quantityGradient,
            borderColor: 'rgb(113, 93, 255)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: 'rgb(113, 93, 255)',
            pointBorderColor: '#1E1E1E',
            pointBorderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Transactions',
            data: transactions,
            backgroundColor: transactionGradient,
            borderColor: 'rgb(255, 166, 0)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: 'rgb(255, 166, 0)',
            pointBorderColor: '#1E1E1E',
            pointBorderWidth: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              callback: function(value, index) {
                // Show fewer labels if many data points
                return dates.length > 15 && index % 2 !== 0 ? '' : dates[index];
              },
              font: {
                size: 10
              }
            }
          },
          y: {
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Total Quantity',
              font: {
                weight: 'bold'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Transaction Count',
              font: {
                weight: 'bold'
              }
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: {
              weight: 'bold',
              size: 13
            },
            bodyFont: {
              size: 12
            },
            callbacks: {
              title: function(context) {
                return `Date: ${context[0].label}`;
              }
            }
          },
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              boxWidth: 8,
              boxHeight: 8
            }
          }
        }
      }
    });
    return chart;
  } catch (error) {
    console.error("Error creating sales over time chart:", error);
    canvas.parentNode.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i>
        Error rendering time series chart: ${error.message}
      </div>`;
    return null;
  }
}

// Chart instances for cleanup
let productSalesChart = null;
let salesTimeChart = null;
let associationHeatmapChart = null;

// Apply our enhanced visualizations
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, initializing visualizations");
  
  // Destroy any existing charts first to prevent the "Canvas already in use" error
  if (productSalesChart) {
    productSalesChart.destroy();
    productSalesChart = null;
  }
  
  if (salesTimeChart) {
    salesTimeChart.destroy();
    salesTimeChart = null;
  }
  
  if (associationHeatmapChart) {
    associationHeatmapChart.destroy();
    associationHeatmapChart = null;
  }
  
  // Check for product sales chart
  const salesChartCanvas = document.getElementById('sales-chart');
  if (salesChartCanvas) {
    try {
      const salesData = salesChartCanvas.dataset.sales;
      if (salesData) {
        console.log("Found sales chart canvas, initializing...");
        // Clear any existing chart instance
        Chart.getChart(salesChartCanvas)?.destroy();
        
        // Create the new chart and store the instance
        const chart = createEnhancedProductSalesChart(salesChartCanvas, salesData);
        if (chart) productSalesChart = chart;
      }
    } catch (error) {
      console.error("Error initializing product sales chart:", error);
    }
  }
  
  // Check for sales over time chart
  const salesTimeChartCanvas = document.getElementById('sales-time-chart');
  if (salesTimeChartCanvas) {
    try {
      const salesData = salesTimeChartCanvas.dataset.sales;
      if (salesData) {
        console.log("Found sales time chart canvas, initializing...");
        // Clear any existing chart instance
        Chart.getChart(salesTimeChartCanvas)?.destroy();
        
        // Create the new chart and store the instance
        const chart = createEnhancedSalesOverTimeChart(salesTimeChartCanvas, salesData);
        if (chart) salesTimeChart = chart;
      }
    } catch (error) {
      console.error("Error initializing sales over time chart:", error);
    }
  }
  
  // Check for association heatmap
  const heatmapCanvas = document.getElementById('association-heatmap');
  if (heatmapCanvas) {
    try {
      console.log("Found heatmap canvas, attempting to initialize...");
      let rulesData;
      try {
        rulesData = JSON.parse(heatmapCanvas.dataset.rules || '[]');
        console.log("Parsed rules data:", rulesData.length, "rules found");
      } catch (parseError) {
        console.error("Error parsing rules data:", parseError);
        rulesData = [];
      }
      
      if (rulesData && rulesData.length > 0) {
        console.log("Creating heatmap with", rulesData.length, "rules");
        // Clear any existing chart instance
        if (Chart.getChart(heatmapCanvas)) {
          console.log("Destroying existing heatmap chart");
          Chart.getChart(heatmapCanvas).destroy();
        }
        
        // Create the new chart and store the instance
        setTimeout(() => {
          console.log("Initializing heatmap with timeout");
          const chart = createEnhancedHeatmap(heatmapCanvas, rulesData);
          if (chart) {
            console.log("Heatmap created successfully");
            associationHeatmapChart = chart;
          } else {
            console.error("Failed to create heatmap chart");
          }
        }, 100);
      } else {
        console.warn("No rules data available for heatmap");
      }
    } catch (error) {
      console.error("Error initializing enhanced heatmap:", error);
    }
  } else {
    console.warn("Association heatmap canvas not found");
  }
});