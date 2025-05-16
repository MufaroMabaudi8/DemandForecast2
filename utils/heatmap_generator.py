"""
Heatmap Generator for Product Association Analysis
"""
import numpy as np
import base64
from io import BytesIO
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import json
import pandas as pd

def generate_association_heatmap(rules, max_products=15):
    """
    Generate a heatmap visualization for product associations.
    
    Args:
        rules (list): List of association rules
        max_products (int): Maximum number of products to display
        
    Returns:
        str: Base64 encoded image
    """
    if not rules or len(rules) == 0:
        return None
    
    # Extract product information and count frequency
    product_frequency = {}
    for rule in rules:
        antecedents = rule.antecedents if isinstance(rule.antecedents, list) else [rule.antecedents]
        consequents = rule.consequents if isinstance(rule.consequents, list) else [rule.consequents]
        
        for product in antecedents + consequents:
            if product in product_frequency:
                product_frequency[product] += 1
            else:
                product_frequency[product] = 1
    
    # Get top products by frequency
    top_products = sorted(product_frequency.items(), key=lambda x: x[1], reverse=True)
    top_products = [p[0] for p in top_products[:max_products]]
    
    # Create a matrix for the heatmap
    matrix_size = len(top_products)
    heatmap_matrix = np.zeros((matrix_size, matrix_size))
    
    # Fill the matrix with lift values
    for i, p1 in enumerate(top_products):
        for j, p2 in enumerate(top_products):
            if i != j:  # Skip self-associations
                # Find rules where p1 -> p2
                matching_rules = [r for r in rules if 
                                 (p1 in (r.antecedents if isinstance(r.antecedents, list) else [r.antecedents])) and 
                                 (p2 in (r.consequents if isinstance(r.consequents, list) else [r.consequents]))]
                
                if matching_rules:
                    # Use the highest lift value if multiple rules exist
                    best_rule = max(matching_rules, key=lambda r: r.lift)
                    heatmap_matrix[i, j] = best_rule.lift
    
    # Create the heatmap
    plt.figure(figsize=(12, 10))
    
    # Create a mask for zero values
    mask = heatmap_matrix == 0
    
    # Get colormap
    cmap = matplotlib.colormaps['plasma']  # Using plasma colormap
    
    # Plot heatmap
    plt.imshow(heatmap_matrix, cmap=cmap, interpolation='nearest')
    plt.colorbar(label='Lift')
    
    # Add labels
    plt.xticks(np.arange(matrix_size), top_products, rotation=45, ha='right')
    plt.yticks(np.arange(matrix_size), top_products)
    
    plt.xlabel('Consequent Products')
    plt.ylabel('Antecedent Products')
    plt.title('Product Association Heatmap')
    
    # Add grid
    plt.grid(False)
    
    # Add values to cells
    if not mask.all():  # Check if there are any non-zero values
        for i in range(matrix_size):
            for j in range(matrix_size):
                if not mask[i, j]:
                    plt.text(j, i, f"{heatmap_matrix[i, j]:.2f}", 
                            ha="center", va="center", 
                            color="white" if heatmap_matrix[i, j] > np.mean(heatmap_matrix[~mask]) else "black")
    
    plt.tight_layout()
    
    # Convert plot to base64 image
    buffer = BytesIO()
    plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    
    # Encode as base64
    image_base64 = base64.b64encode(image_png).decode('utf-8')
    
    plt.close()
    
    return image_base64

def generate_metrics_visualization(rules):
    """
    Generate a scatter plot showing support vs confidence with lift as bubble size.
    
    Args:
        rules (list): List of association rules
        
    Returns:
        str: Base64 encoded image
    """
    if not rules or len(rules) == 0:
        return None
    
    # Extract metrics
    supports = [rule.support for rule in rules]
    confidences = [rule.confidence for rule in rules]
    lifts = [rule.lift for rule in rules]
    
    # Create the scatter plot
    plt.figure(figsize=(10, 6))
    plt.scatter(supports, confidences, s=np.array(lifts) * 30, alpha=0.6, 
                c=lifts, cmap='viridis')
    
    plt.colorbar(label='Lift')
    plt.xlabel('Support')
    plt.ylabel('Confidence')
    plt.title('Association Rules - Support vs Confidence (size/color = Lift)')
    plt.grid(True, alpha=0.3)
    
    # Convert plot to base64 image
    buffer = BytesIO()
    plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    
    # Encode as base64
    image_base64 = base64.b64encode(image_png).decode('utf-8')
    
    plt.close()
    
    return image_base64