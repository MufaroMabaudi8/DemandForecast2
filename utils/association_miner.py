from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
import pandas as pd
import numpy as np
import logging

def prepare_transactions(df):
    """
    Prepare transaction data for association rule mining.
    
    Args:
        df (DataFrame): The processed dataframe
        
    Returns:
        DataFrame: One-hot encoded transaction data
    """
    # Group by transaction ID and create lists of products
    transactions = df.groupby('Transaction_ID')['Product_Name'].apply(list).tolist()
    
    # One-hot encode the transactions
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df_encoded = pd.DataFrame(te_ary, columns=te.columns_)
    
    return df_encoded

def run_apriori(df, min_support=0.01, min_confidence=0.2):
    """
    Run the Apriori algorithm and generate association rules.
    
    Args:
        df (DataFrame): The processed dataframe
        min_support (float): Minimum support threshold
        min_confidence (float): Minimum confidence threshold
        
    Returns:
        DataFrame: Association rules
    """
    try:
        # Prepare transaction data
        df_encoded = prepare_transactions(df)
        
        # Run apriori to find frequent itemsets
        frequent_itemsets = apriori(df_encoded, min_support=min_support, use_colnames=True)
        
        # No frequent itemsets found
        if frequent_itemsets.empty:
            logging.warning("No frequent itemsets found with the current support threshold.")
            return pd.DataFrame()
        
        # Generate association rules
        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
        
        # No rules found
        if rules.empty:
            logging.warning("No association rules found with the current confidence threshold.")
            return pd.DataFrame()
        
        # Sort rules by lift (descending)
        rules = rules.sort_values('lift', ascending=False)
        
        return rules
    
    except Exception as e:
        logging.error(f"Error running Apriori algorithm: {str(e)}")
        raise

def visualize_association_rules(rules):
    """
    Prepare association rules for visualization.
    
    Args:
        rules (DataFrame): Association rules
        
    Returns:
        dict: Data for visualization
    """
    if rules.empty:
        return {
            'nodes': [],
            'links': []
        }
    
    # Prepare network data
    nodes = set()
    for _, row in rules.iterrows():
        for item in row['antecedents']:
            nodes.add(item)
        for item in row['consequents']:
            nodes.add(item)
    
    nodes_list = [{'id': node, 'group': 1} for node in nodes]
    
    links = []
    for _, row in rules.iterrows():
        for ant in row['antecedents']:
            for cons in row['consequents']:
                links.append({
                    'source': ant,
                    'target': cons,
                    'value': row['lift']
                })
    
    return {
        'nodes': nodes_list,
        'links': links
    }
