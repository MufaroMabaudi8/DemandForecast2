// Chart.js Matrix Controller Plugin
// This plugin adds support for matrix/heatmap charts in Chart.js

(function() {
    // Exit if Chart is not available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is required for matrix plugin.');
        return;
    }

    // Matrix controller
    const matrixController = {
        id: 'matrix',
        defaults: {
            borderWidth: 1,
            borderColor: 'transparent',
            width: ({ chart }) => chart.chartArea ? chart.chartArea.width / chart.scales.x.ticks.length : 20,
            height: ({ chart }) => chart.chartArea ? chart.chartArea.height / chart.scales.y.ticks.length : 20
        },
        dataElementType: 'matrix',
        
        update: function(mode) {
            const meta = this.getMeta();
            const { data } = meta;
            const { width, height } = this.resolveDataElementOptions(0);
            
            if (mode !== 'resize') {
                const xScale = this.getScaleForId(meta.xAxisID);
                const yScale = this.getScaleForId(meta.yAxisID);
                
                let i = 0;
                for (const rawDataPoint of this.getDataset().data) {
                    const index = data[i] ? i : meta.data.length;
                    
                    if (!data[index]) {
                        const dataElement = new Chart.elements.PointElement({ x: 0, y: 0 });
                        dataElement.tooltipPosition = function() {
                            return { x: this.x, y: this.y };
                        };
                        data[index] = dataElement;
                    }
                    
                    // Position the data element
                    const x = xScale.getPixelForValue(rawDataPoint.x);
                    const y = yScale.getPixelForValue(rawDataPoint.y);
                    
                    data[index].x = x;
                    data[index].y = y;
                    data[index].width = width;
                    data[index].height = height;
                    data[index].options = this.resolveDataElementOptions(i);
                    data[index].options.v = rawDataPoint.v;
                    
                    i++;
                }
            }
        },
        
        draw: function() {
            const ctx = this.chart.ctx;
            const meta = this.getMeta();
            const { data } = meta;
            
            for (let i = 0; i < data.length; i++) {
                const dataElement = data[i];
                ctx.save();
                
                // Get options for this element
                const options = dataElement.options || this.resolveDataElementOptions(i);
                const width = dataElement.width || options.width;
                const height = dataElement.height || options.height;
                
                // Set fill color based on the value
                if (typeof options.backgroundColor === 'function') {
                    ctx.fillStyle = options.backgroundColor({
                        dataIndex: i,
                        dataset: this.getDataset(),
                        datasetIndex: this.index
                    });
                } else {
                    ctx.fillStyle = options.backgroundColor;
                }
                
                // Draw rectangle
                ctx.fillRect(dataElement.x - width / 2, dataElement.y - height / 2, width, height);
                
                // Draw border if specified
                if (options.borderWidth) {
                    ctx.strokeStyle = options.borderColor;
                    ctx.lineWidth = options.borderWidth;
                    ctx.strokeRect(dataElement.x - width / 2, dataElement.y - height / 2, width, height);
                }
                
                ctx.restore();
            }
        }
    };
    
    // Register the controller
    Chart.register({
        id: 'matrix',
        controller: matrixController
    });
    
    // Add matrix element type
    Chart.defaults.elements.matrix = {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderColor: 'transparent',
        borderWidth: 0
    };
    
    console.log('Chart.js Matrix plugin registered');
})();
