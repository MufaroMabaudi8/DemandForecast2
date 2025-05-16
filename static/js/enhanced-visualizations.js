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
    return;
  }
  
  try {
    // Extract unique products (limit to top products for readability)
    const maxProducts = Math.min(12, Math.floor(Math.sqrt(rules.length * 2))); 
    const productFrequency = new Map();
    
    // Count product frequency
    rules.forEach(rule => {
      [...rule.antecedents, ...rule.consequents].forEach(product => {
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

// Apply our enhanced visualizations
document.addEventListener('DOMContentLoaded', function() {
  // Check if we have association data and canvas
  const heatmapCanvas = document.getElementById('association-heatmap');
  if (heatmapCanvas) {
    try {
      const rulesData = JSON.parse(heatmapCanvas.dataset.rules || '[]');
      if (rulesData && rulesData.length > 0) {
        createEnhancedHeatmap(heatmapCanvas, rulesData);
      }
    } catch (error) {
      console.error("Error initializing enhanced heatmap:", error);
    }
  }
});