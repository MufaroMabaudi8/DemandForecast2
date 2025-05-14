import os
import json
import pandas as pd
from flask import render_template, request, redirect, url_for, flash, jsonify, session
from werkzeug.utils import secure_filename
from app import app, db
from models import Dataset, Association, Forecast
from utils.data_processor import process_data, validate_data, get_dataset_summary
from utils.association_miner import run_apriori
from utils.demand_forecaster import forecast_demand
import logging

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    # Get the latest dataset if available
    latest_dataset = Dataset.query.order_by(Dataset.upload_date.desc()).first()
    return render_template('index.html', dataset=latest_dataset)

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        # Check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part', 'error')
            return redirect(request.url)
        
        file = request.files['file']
        
        # If the user does not select a file, the browser submits an empty file
        if file.filename == '':
            flash('No selected file', 'error')
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Validate file
            is_valid, message = validate_data(filepath)
            
            if not is_valid:
                os.remove(filepath)  # Delete invalid file
                flash(f'Invalid file: {message}', 'error')
                return redirect(request.url)
            
            # Process data and store in database
            try:
                dataset_summary = get_dataset_summary(filepath)
                
                new_dataset = Dataset(
                    filename=filename,
                    row_count=dataset_summary['row_count'],
                    product_count=dataset_summary['product_count'],
                    transaction_count=dataset_summary['transaction_count'],
                    date_range_start=dataset_summary['date_range_start'],
                    date_range_end=dataset_summary['date_range_end']
                )
                
                db.session.add(new_dataset)
                db.session.commit()
                
                # Store the dataset ID in the session for further processing
                session['current_dataset_id'] = new_dataset.id
                
                # Process the data in the background
                df = process_data(filepath)
                
                # Run Apriori algorithm
                min_support = float(request.form.get('min_support', 0.01))
                min_confidence = float(request.form.get('min_confidence', 0.2))
                
                association_rules = run_apriori(df, min_support, min_confidence)
                
                # Save association rules to database
                for _, rule in association_rules.iterrows():
                    new_association = Association(
                        dataset_id=new_dataset.id,
                        antecedents=str(list(rule['antecedents'])),
                        consequents=str(list(rule['consequents'])),
                        support=rule['support'],
                        confidence=rule['confidence'],
                        lift=rule['lift']
                    )
                    db.session.add(new_association)
                
                # Run forecasting
                forecast_results = forecast_demand(df)
                
                # Save forecast results to database
                for product, forecasts in forecast_results.items():
                    for date, quantity in forecasts.items():
                        new_forecast = Forecast(
                            dataset_id=new_dataset.id,
                            product_name=product,
                            forecast_date=date,
                            predicted_quantity=quantity
                        )
                        db.session.add(new_forecast)
                
                db.session.commit()
                
                # Mark dataset as processed
                new_dataset.processed = True
                db.session.commit()
                
                flash('File successfully uploaded and processed!', 'success')
                return redirect(url_for('analysis'))
                
            except Exception as e:
                logging.error(f"Error processing file: {str(e)}")
                db.session.rollback()
                flash(f'Error processing file: {str(e)}', 'error')
                return redirect(request.url)
        else:
            flash('File type not allowed. Please upload a CSV or Excel file.', 'error')
            return redirect(request.url)
    
    return render_template('upload.html')

@app.route('/analysis')
def analysis():
    # Get the current dataset or the latest one
    dataset_id = session.get('current_dataset_id')
    if not dataset_id:
        dataset = Dataset.query.order_by(Dataset.upload_date.desc()).first()
        if dataset:
            dataset_id = dataset.id
        else:
            flash('No dataset found. Please upload data first.', 'warning')
            return redirect(url_for('upload'))
    else:
        dataset = Dataset.query.get(dataset_id)
    
    # Get association rules for the dataset
    associations = Association.query.filter_by(dataset_id=dataset_id).all()
    
    # Prepare data for visualization
    rules_data = []
    for rule in associations:
        rules_data.append({
            'antecedents': json.loads(rule.antecedents.replace("'", '"')),
            'consequents': json.loads(rule.consequents.replace("'", '"')),
            'support': rule.support,
            'confidence': rule.confidence,
            'lift': rule.lift
        })
    
    return render_template('analysis.html', dataset=dataset, rules=rules_data)

@app.route('/forecast')
def forecast():
    # Get the current dataset or the latest one
    dataset_id = session.get('current_dataset_id')
    if not dataset_id:
        dataset = Dataset.query.order_by(Dataset.upload_date.desc()).first()
        if dataset:
            dataset_id = dataset.id
        else:
            flash('No dataset found. Please upload data first.', 'warning')
            return redirect(url_for('upload'))
    else:
        dataset = Dataset.query.get(dataset_id)
    
    # Get forecast data for the dataset
    forecasts = Forecast.query.filter_by(dataset_id=dataset_id).all()
    
    # Group forecasts by product
    forecast_data = {}
    for forecast in forecasts:
        if forecast.product_name not in forecast_data:
            forecast_data[forecast.product_name] = []
        
        forecast_data[forecast.product_name].append({
            'date': forecast.forecast_date.strftime('%Y-%m-%d'),
            'quantity': forecast.predicted_quantity
        })
    
    return render_template('forecast.html', dataset=dataset, forecast_data=json.dumps(forecast_data))

@app.route('/api/dataset/<int:dataset_id>/summary')
def dataset_summary_api(dataset_id):
    dataset = Dataset.query.get_or_404(dataset_id)
    return jsonify({
        'filename': dataset.filename,
        'upload_date': dataset.upload_date.strftime('%Y-%m-%d %H:%M:%S'),
        'row_count': dataset.row_count,
        'product_count': dataset.product_count,
        'transaction_count': dataset.transaction_count,
        'date_range': {
            'start': dataset.date_range_start.strftime('%Y-%m-%d'),
            'end': dataset.date_range_end.strftime('%Y-%m-%d')
        }
    })

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500
