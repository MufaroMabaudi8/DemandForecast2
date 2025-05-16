// Association Heatmap Visualization
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing association heatmap");
    
    // Get the heatmap canvas
    const heatmapCanvas = document.getElementById('association-heatmap');
    if (!heatmapCanvas) {
        console.warn("Heatmap canvas not found");
        return;
    }
    
    try {
        // Parse the rules data
        let rules = [];
        try {
            rules = JSON.parse(heatmapCanvas.dataset.rules || '[]');
            console.log("Parsed rules data:", rules.length, "rules found");
        } catch (e) {
            console.error("Error parsing rules data:", e);
            return;
        }
        
        if (!rules || rules.length === 0) {
            console.warn("No association rules available for heatmap");
            heatmapCanvas.parentNode.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    No association rules available for visualization.
                </div>`;
            return;
        }
        
        // Extract unique products (limit to top products for readability)
        const maxProducts = Math.min(12, Math.floor(Math.sqrt(rules.length * 2)));
        const productFrequency = new Map();
        
        // Count product frequency in rules
        rules.forEach(rule => {
            // Handle both array and string formats
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
        
        console.log("Top products:", topProducts);
        
        if (topProducts.length === 0) {
            heatmapCanvas.parentNode.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    No product associations found. Try lowering the support threshold.
                </div>`;
            return;
        }
        
        // Create data for our heatmap using bubbles
        const heatmapData = [];
        for (let i = 0; i < topProducts.length; i++) {
            for (let j = 0; j < topProducts.length; j++) {
                if (i !== j) { // Skip self-associations
                    const product1 = topProducts[i];
                    const product2 = topProducts[j];
                    
                    // Find rules with this pair
                    const matchingRules = rules.filter(rule => {
                        const antecedents = Array.isArray(rule.antecedents) ? rule.antecedents : [rule.antecedents];
                        const consequents = Array.isArray(rule.consequents) ? rule.consequents : [rule.consequents];
                        
                        return antecedents.includes(product1) && consequents.includes(product2);
                    });
                    
                    if (matchingRules.length > 0) {
                        // Get the rule with the highest lift
                        const bestRule = matchingRules.reduce(
                            (best, current) => current.lift > best.lift ? current : best, 
                            matchingRules[0]
                        );
                        
                        heatmapData.push({
                            // For scatter chart, x and y are numeric indexes
                            x: i,
                            y: j,
                            // Store original product names and metrics
                            product1: product1,
                            product2: product2,
                            lift: bestRule.lift,
                            support: bestRule.support,
                            confidence: bestRule.confidence
                        });
                    }
                }
            }
        }
        
        console.log("Heatmap data points:", heatmapData.length);
        
        // Calculate min/max lift for color scaling
        const liftValues = heatmapData.map(item => item.lift);
        const minLift = Math.min(...liftValues);
        const maxLift = Math.max(...liftValues);
        
        // Helper function to get color based on value
        function getColorForValue(value) {
            // Normalize value between 0-1
            const normalizedValue = (value - minLift) / (maxLift - minLift);
            
            // Create color gradient: blue -> green -> yellow -> red
            let r, g, b;
            if (normalizedValue < 0.25) {
                // Blue to cyan
                r = Math.round(0 + (normalizedValue * 4) * 50);
                g = Math.round(100 + (normalizedValue * 4) * 50);
                b = 160;
            } else if (normalizedValue < 0.5) {
                // Cyan to green
                r = Math.round(50 + ((normalizedValue - 0.25) * 4) * 50);
                g = Math.round(150 + ((normalizedValue - 0.25) * 4) * 50);
                b = Math.round(200 - ((normalizedValue - 0.25) * 4) * 100);
            } else if (normalizedValue < 0.75) {
                // Green to yellow
                r = Math.round(100 + ((normalizedValue - 0.5) * 4) * 155);
                g = 200;
                b = Math.round(100 - ((normalizedValue - 0.5) * 4) * 100);
            } else {
                // Yellow to red
                r = 255;
                g = Math.round(255 - ((normalizedValue - 0.75) * 4) * 255);
                b = 0;
            }
            
            return `rgba(${r}, ${g}, ${b}, 0.85)`;
        }
        
        // Create the bubble chart for our heatmap
        const chart = new Chart(heatmapCanvas, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Product Associations',
                    data: heatmapData.map(item => ({
                        x: item.x,
                        y: item.y,
                        r: 10 + item.lift * 2, // Radius based on lift
                        ...item // Pass through all the original data
                    })),
                    backgroundColor: heatmapData.map(item => getColorForValue(item.lift)),
                    hoverBackgroundColor: heatmapData.map(item => getColorForValue(item.lift)),
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return 'Product Association';
                            },
                            label: function(context) {
                                const item = context.raw;
                                return [
                                    `If customers buy: ${item.product1}`,
                                    `They may also buy: ${item.product2}`,
                                    `Lift: ${item.lift.toFixed(2)}`,
                                    `Support: ${item.support.toFixed(3)}`,
                                    `Confidence: ${item.confidence.toFixed(3)}`
                                ];
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: -0.5,
                        max: topProducts.length - 0.5,
                        ticks: {
                            callback: function(value) {
                                return topProducts[value] || '';
                            },
                            maxRotation: 90,
                            minRotation: 45
                        },
                        title: {
                            display: true,
                            text: 'If Customer Buys (Antecedent)',
                            color: '#eee',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        min: -0.5,
                        max: topProducts.length - 0.5,
                        ticks: {
                            callback: function(value) {
                                return topProducts[value] || '';
                            }
                        },
                        title: {
                            display: true,
                            text: 'May Also Buy (Consequent)',
                            color: '#eee',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
        
        console.log("Association heatmap created successfully");
        
    } catch (error) {
        console.error("Error creating association heatmap:", error);
        heatmapCanvas.parentNode.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Error creating heatmap: ${error.message}
            </div>`;
    }
});