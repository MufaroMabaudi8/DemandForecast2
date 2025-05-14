from app import db
from datetime import datetime

class Dataset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    processed = db.Column(db.Boolean, default=False)
    row_count = db.Column(db.Integer)
    product_count = db.Column(db.Integer)
    transaction_count = db.Column(db.Integer)
    date_range_start = db.Column(db.DateTime)
    date_range_end = db.Column(db.DateTime)
    
    def __repr__(self):
        return f'<Dataset {self.filename}>'

class Association(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'), nullable=False)
    antecedents = db.Column(db.String(255), nullable=False)
    consequents = db.Column(db.String(255), nullable=False)
    support = db.Column(db.Float, nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    lift = db.Column(db.Float, nullable=False)
    
    def __repr__(self):
        return f'<Association {self.antecedents} -> {self.consequents}>'

class Forecast(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'), nullable=False)
    product_name = db.Column(db.String(255), nullable=False)
    forecast_date = db.Column(db.DateTime, nullable=False)
    predicted_quantity = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Forecast {self.product_name} - {self.forecast_date}>'
