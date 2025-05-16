import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import LabelEncoder
import logging
import warnings

warnings.filterwarnings('ignore')

def prepare_features(df):
    """
    Prepare features for the demand forecasting model.
    
    Args:
        df (DataFrame): The processed dataframe
        
    Returns:
        tuple: X, y, and LabelEncoder for product names
    """
    # Group by product and date to get daily sales
    daily_sales = df.groupby(['Product_Name', pd.Grouper(key='Date', freq='D')])['Quantity'].sum().reset_index()
    
    # Create features
    daily_sales['Year'] = daily_sales['Date'].dt.year
    daily_sales['Month'] = daily_sales['Date'].dt.month
    daily_sales['Day'] = daily_sales['Date'].dt.day
    daily_sales['DayOfWeek'] = daily_sales['Date'].dt.dayofweek
    daily_sales['Weekend'] = daily_sales['DayOfWeek'].apply(lambda x: 1 if x >= 5 else 0)
    
    # Encode product names
    le = LabelEncoder()
    daily_sales['Product_Encoded'] = le.fit_transform(daily_sales['Product_Name'])
    
    # Create lag features (previous day's sales)
    daily_sales = daily_sales.sort_values(['Product_Name', 'Date'])
    daily_sales['Lag1'] = daily_sales.groupby('Product_Name')['Quantity'].shift(1)
    daily_sales['Lag7'] = daily_sales.groupby('Product_Name')['Quantity'].shift(7)
    
    # Create rolling mean features
    daily_sales['RollingMean7'] = daily_sales.groupby('Product_Name')['Quantity'].transform(
        lambda x: x.rolling(window=7, min_periods=1).mean())
    daily_sales['RollingMean30'] = daily_sales.groupby('Product_Name')['Quantity'].transform(
        lambda x: x.rolling(window=30, min_periods=1).mean())
    
    # Drop rows with NaN values
    daily_sales = daily_sales.dropna()
    
    # Define features and target
    features = ['Year', 'Month', 'Day', 'DayOfWeek', 'Weekend', 'Product_Encoded', 
                'Lag1', 'Lag7', 'RollingMean7', 'RollingMean30']
    
    X = daily_sales[features]
    y = daily_sales['Quantity']
    
    return X, y, le, daily_sales

def train_model(X, y):
    """
    Train the XGBoost model for demand forecasting.
    
    Args:
        X (DataFrame): Features
        y (Series): Target variable
        
    Returns:
        XGBRegressor: Trained model
    """
    # Split data into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Define XGBoost parameters
    params = {
        'objective': 'reg:squarederror',
        'n_estimators': 100,
        'learning_rate': 0.1,
        'max_depth': 6,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'seed': 42
    }
    
    # Train the model
    model = xgb.XGBRegressor(**params)
    model.fit(X_train, y_train)
    
    # Evaluate the model
    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    logging.info(f"Model RMSE: {rmse}")
    
    return model

def forecast_demand(df, forecast_days=30):
    """
    Forecast demand for the next specified number of days.
    
    Args:
        df (DataFrame): The processed dataframe
        forecast_days (int): Number of days to forecast
        
    Returns:
        dict: Forecasted demand by product and date
    """
    try:
        # Check if we have enough data
        if len(df) < 30:
            logging.warning("Insufficient data for accurate forecasting. Minimum 30 records recommended.")
            
        # Prepare features
        X, y, le, daily_sales = prepare_features(df)
        
        if len(X) < 10:
            logging.warning("Very limited data after feature preparation. Forecasts may be inaccurate.")
            
        # Train the model
        model = train_model(X, y)
        
        # Prepare forecast data
        max_date = df['Date'].max()
        product_names = df['Product_Name'].unique()
        
        logging.info(f"Forecasting demand for {len(product_names)} products over {forecast_days} days")
        
        forecast_results = {}
        
        for product in product_names:
            forecast_results[product] = []
            
            # Get the latest data for this product
            product_data = daily_sales[daily_sales['Product_Name'] == product].sort_values('Date')
            
            if product_data.empty:
                logging.warning(f"No data available for product: {product}")
                continue
            
            # Get the encoded value for this product
            product_encoded = le.transform([product])[0]
            
            # Store the last known values for updating rolling features
            last_predictions = {}
            
            # Iterate through each day to forecast
            for i in range(1, forecast_days + 1):
                forecast_date = max_date + timedelta(days=i)
                
                # Create features for this date
                features = {
                    'Year': forecast_date.year,
                    'Month': forecast_date.month,
                    'Day': forecast_date.day,
                    'DayOfWeek': forecast_date.weekday(),
                    'Weekend': 1 if forecast_date.weekday() >= 5 else 0,
                    'Product_Encoded': product_encoded
                }
                
                # Use the last known values for lag and rolling features
                if i == 1:
                    features['Lag1'] = float(product_data['Quantity'].iloc[-1])
                else:
                    features['Lag1'] = last_predictions.get(i-1, float(product_data['Quantity'].mean()))
                
                # Handle lag7 (previous week's sales)
                if len(product_data) >= 7:
                    features['Lag7'] = float(product_data['Quantity'].iloc[-7])
                else:
                    features['Lag7'] = float(product_data['Quantity'].mean())
                
                # Handle rolling means
                features['RollingMean7'] = float(product_data['Quantity'].iloc[-min(7, len(product_data)):].mean())
                
                if len(product_data) >= 30:
                    features['RollingMean30'] = float(product_data['Quantity'].iloc[-30:].mean())
                else:
                    features['RollingMean30'] = float(product_data['Quantity'].mean())
                
                # Make prediction
                features_df = pd.DataFrame([features])
                prediction = max(0, float(model.predict(features_df)[0]))  # Ensure non-negative prediction
                
                # Store for next iteration
                last_predictions[i] = prediction
                
                # Store forecast in the list format to avoid JSON serialization issues
                forecast_results[product].append({
                    'date': forecast_date.strftime('%Y-%m-%d'),
                    'quantity': prediction
                })
        
        return forecast_results
    
    except Exception as e:
        logging.error(f"Error forecasting demand: {str(e)}")
        logging.exception("Full exception details:")
        # Return empty result instead of raising an exception
        return {}
