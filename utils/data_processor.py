import pandas as pd
import numpy as np
from datetime import datetime
import os

def validate_data(file_path):
    """
    Validate that the uploaded file has the required columns and format.
    
    Args:
        file_path (str): Path to the uploaded file
        
    Returns:
        tuple: (is_valid, message)
    """
    try:
        # Determine file type based on extension
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            return False, "Unsupported file format. Please upload a CSV or Excel file."
        
        # Check for required columns
        required_columns = ['Transaction_ID', 'Product_Name', 'Date', 'Quantity']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return False, f"Missing required columns: {', '.join(missing_columns)}"
        
        # Check data types and format
        try:
            # Check if Date column can be converted to datetime
            pd.to_datetime(df['Date'])
        except:
            return False, "Invalid date format in the 'Date' column"
        
        # Check if Quantity column can be converted to numeric
        if not pd.to_numeric(df['Quantity'], errors='coerce').notna().all():
            return False, "Invalid numeric values in the 'Quantity' column"
        
        # Check for empty values in required columns
        for col in required_columns:
            if df[col].isna().any():
                return False, f"Missing values in '{col}' column"
        
        return True, "Data is valid"
    
    except Exception as e:
        return False, str(e)

def process_data(file_path):
    """
    Process the uploaded file to prepare for analysis.
    
    Args:
        file_path (str): Path to the uploaded file
        
    Returns:
        DataFrame: Processed data
    """
    # Determine file type based on extension
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
    elif file_path.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(file_path)
    
    # Convert date column to datetime
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Convert quantity to numeric
    df['Quantity'] = pd.to_numeric(df['Quantity'])
    
    # Sort by date
    df = df.sort_values('Date')
    
    # Create transaction-product matrix for association analysis
    df['Transaction_ID'] = df['Transaction_ID'].astype(str)
    
    return df

def get_dataset_summary(file_path):
    """
    Get summary statistics for the uploaded dataset.
    
    Args:
        file_path (str): Path to the uploaded file
        
    Returns:
        dict: Summary statistics
    """
    # Determine file type based on extension
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
    elif file_path.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(file_path)
    
    # Convert date column to datetime
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Get summary statistics
    row_count = len(df)
    product_count = df['Product_Name'].nunique()
    transaction_count = df['Transaction_ID'].nunique()
    date_range_start = df['Date'].min()
    date_range_end = df['Date'].max()
    
    return {
        'row_count': row_count,
        'product_count': product_count,
        'transaction_count': transaction_count,
        'date_range_start': date_range_start,
        'date_range_end': date_range_end
    }

def get_sales_data_for_visualization(df):
    """
    Process sales data for visualization.
    
    Args:
        df (DataFrame): The processed dataframe
        
    Returns:
        dict: Data for visualization
    """
    # Group by product and date to get total sales
    product_sales = df.groupby('Product_Name')['Quantity'].sum().sort_values(ascending=False)
    top_products = product_sales.head(10)
    
    # Group by date to get sales over time
    sales_over_time = df.groupby(df['Date'].dt.strftime('%Y-%m-%d')).agg({
        'Quantity': 'sum',
        'Transaction_ID': 'nunique'
    }).reset_index()
    sales_over_time.columns = ['Date', 'Total_Quantity', 'Transaction_Count']
    
    return {
        'top_products': top_products.to_dict(),
        'sales_over_time': sales_over_time.to_dict(orient='records')
    }
