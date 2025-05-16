import os
import json
import pandas as pd
from datetime import datetime
from flask import render_template, request, redirect, url_for, flash, jsonify, session
from werkzeug.utils import secure_filename
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, EmailField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError
from flask_login import login_user, current_user, logout_user, login_required
from app import app, db
from models import User, Dataset, Association, Forecast
from utils.data_processor import process_data, validate_data, get_dataset_summary, get_sales_data_for_visualization
from utils.association_miner import run_apriori, visualize_association_rules
from utils.demand_forecaster import forecast_demand
from utils.heatmap_generator import generate_association_heatmap, generate_metrics_visualization
import logging

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Form classes
class LoginForm(FlaskForm):
    email = EmailField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Remember Me')
    submit = SubmitField('Login')

class SignupForm(FlaskForm):
    fullname = StringField('Full Name', validators=[DataRequired(), Length(min=2, max=100)])
    email = EmailField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField('Confirm Password', 
                                    validators=[DataRequired(), EqualTo('password', message='Passwords must match')])
    submit = SubmitField('Sign Up')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email address already registered. Please use a different email.')

class ForgotPasswordForm(FlaskForm):
    email = EmailField('Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Send Reset Instructions')

@app.route('/')
def index():
    # Get the latest dataset if available
    latest_dataset = Dataset.query.order_by(Dataset.upload_date.desc()).first()
    return render_template('index.html', dataset=latest_dataset, form=None)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember.data)
            next_page = request.args.get('next')
            flash('Login successful!', 'success')
            return redirect(next_page or url_for('index'))
        else:
            flash('Login failed. Please check email and password.', 'error')
    
    return render_template('login.html', form=form)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = SignupForm()
    if form.validate_on_submit():
        user = User()
        user.fullname = form.fullname.data
        user.email = form.email.data
        user.set_password(form.password.data)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Account created successfully! You can now log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('signup.html', form=form)

@app.route('/logout')
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    form = ForgotPasswordForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            # In a real application, send password reset email
            flash('If your email exists in our system, you will receive reset instructions shortly.', 'info')
            return redirect(url_for('login'))
        else:
            # For security, don't reveal that the email doesn't exist
            flash('If your email exists in our system, you will receive reset instructions shortly.', 'info')
            return redirect(url_for('login'))
    
    return render_template('forgot_password.html', form=form)

@app.route('/upload', methods=['GET', 'POST'])
@login_required
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
            filename = secure_filename(file.filename or "")
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
                
                new_dataset = Dataset()
                new_dataset.filename = filename
                new_dataset.row_count = dataset_summary['row_count']
                new_dataset.product_count = dataset_summary['product_count']
                new_dataset.transaction_count = dataset_summary['transaction_count']
                new_dataset.date_range_start = dataset_summary['date_range_start']
                new_dataset.date_range_end = dataset_summary['date_range_end']
                
                db.session.add(new_dataset)
                db.session.commit()
                
                # Store the dataset ID in the session for further processing
                session['current_dataset_id'] = new_dataset.id
                
                # Process the data in the background
                df = process_data(filepath)
                
                # Generate sales data visualization
                sales_data = get_sales_data_for_visualization(df)
                session['sales_data'] = json.dumps(sales_data)
                
                # Run Apriori algorithm with updated default thresholds
                min_support = float(request.form.get('min_support', 0.05))  # Updated from 0.01 to 0.05
                min_confidence = float(request.form.get('min_confidence', 0.2))
                
                association_rules = run_apriori(df, min_support, min_confidence)
                
                # Save association rules to database
                if not association_rules.empty:
                    for _, rule in association_rules.iterrows():
                        new_association = Association()
                        new_association.dataset_id = new_dataset.id
                        new_association.antecedents = str(list(rule['antecedents']))
                        new_association.consequents = str(list(rule['consequents']))
                        new_association.support = rule['support']
                        new_association.confidence = rule['confidence']
                        new_association.lift = rule['lift']
                        db.session.add(new_association)
                else:
                    flash('No association rules found with current thresholds. Try lowering the support threshold.', 'warning')
                
                # Run forecasting
                forecast_results = forecast_demand(df)
                
                # Save forecast results to database
                forecast_count = 0
                for product, product_forecasts in forecast_results.items():
                    for forecast_item in product_forecasts:
                        new_forecast = Forecast()
                        new_forecast.dataset_id = new_dataset.id
                        new_forecast.product_name = product
                        new_forecast.forecast_date = datetime.strptime(forecast_item['date'], '%Y-%m-%d')
                        new_forecast.predicted_quantity = float(forecast_item['quantity'])
                        db.session.add(new_forecast)
                        forecast_count += 1
                
                if forecast_count == 0:
                    flash('Unable to generate demand forecasts. The data may be insufficient.', 'warning')
                else:
                    flash(f'Generated {forecast_count} forecast data points across all products.', 'success')
                
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
@login_required
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
        try:
            rules_data.append({
                'antecedents': json.loads(rule.antecedents.replace("'", '"')),
                'consequents': json.loads(rule.consequents.replace("'", '"')),
                'support': rule.support,
                'confidence': rule.confidence,
                'lift': rule.lift
            })
        except json.JSONDecodeError:
            # Alternative parsing for non-JSON format
            try:
                antecedents = rule.antecedents.strip('[]').split(',')
                antecedents = [a.strip().strip("'\"") for a in antecedents]
                
                consequents = rule.consequents.strip('[]').split(',')
                consequents = [c.strip().strip("'\"") for c in consequents]
                
                rules_data.append({
                    'antecedents': antecedents,
                    'consequents': consequents,
                    'support': rule.support,
                    'confidence': rule.confidence,
                    'lift': rule.lift
                })
            except Exception as e:
                logging.error(f"Error parsing rule {rule.id}: {str(e)}")
                continue
            continue
    
    # Get sales data for visualization (from session or regenerate)
    sales_data = session.get('sales_data')
    
    if sales_data:
        sales_data = json.loads(sales_data)
    else:
        # If no sales data in session, try to regenerate from the dataset file
        try:
            if dataset and dataset.filename:
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], dataset.filename)
                if os.path.exists(filepath):
                    df = process_data(filepath)
                    sales_data = get_sales_data_for_visualization(df)
                else:
                    sales_data = {'top_products': {}, 'sales_over_time': []}
            else:
                sales_data = {'top_products': {}, 'sales_over_time': []}
        except Exception as e:
            logging.error(f"Error regenerating sales data: {str(e)}")
            sales_data = {'top_products': {}, 'sales_over_time': []}
    
    # Generate association heatmap
    heatmap_image = None
    if rules_data:
        try:
            heatmap_image = generate_association_heatmap(rules_data)
            logging.info(f"Generated association heatmap with {len(rules_data)} rules")
        except Exception as e:
            logging.error(f"Error generating heatmap: {str(e)}")
            flash(f'Error generating association heatmap: {str(e)}', 'warning')
    
    return render_template('analysis.html', 
                          dataset=dataset, 
                          rules=rules_data, 
                          sales_data=json.dumps(sales_data),
                          heatmap_image=heatmap_image)

@app.route('/forecast')
@login_required
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
    
    # If no forecast data is found, provide a clear message
    if not forecast_data:
        flash('No forecast data is available. The system may need more data for accurate forecasting.', 'warning')
    
    return render_template('forecast.html', dataset=dataset, forecast_data=json.dumps(forecast_data))

@app.route('/api/dataset/<int:dataset_id>/summary')
@login_required
def dataset_summary_api(dataset_id):
    dataset = Dataset.query.get_or_404(dataset_id)
    return jsonify({
        'filename': dataset.filename,
        'upload_date': dataset.upload_date.strftime('%Y-%m-%d %H:%M:%S'),
        'row_count': dataset.row_count,
        'product_count': dataset.product_count,
        'transaction_count': dataset.transaction_count,
        'date_range': {
            'start': dataset.date_range_start.strftime('%Y-%m-%d') if dataset.date_range_start else None,
            'end': dataset.date_range_end.strftime('%Y-%m-%d') if dataset.date_range_end else None
        }
    })

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500
