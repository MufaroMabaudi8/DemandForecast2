import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_login import LoginManager

logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

# Create the app
db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "supersecretkey")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure PostgreSQL database
try:
    # First, try to use DATABASE_URL environment variable
    if os.environ.get("DATABASE_URL"):
        app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
    else:
        # Set up connection parameters from individual environment variables as a fallback
        pg_user = os.environ.get("PGUSER")
        pg_password = os.environ.get("PGPASSWORD")
        pg_host = os.environ.get("PGHOST")
        pg_port = os.environ.get("PGPORT")
        pg_database = os.environ.get("PGDATABASE")
        
        if pg_user and pg_password and pg_host and pg_port and pg_database:
            app.config["SQLALCHEMY_DATABASE_URI"] = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
        else:
            # Fall back to SQLite for local development if PostgreSQL is not available
            logging.warning("PostgreSQL database connection information not found. Using SQLite for local development.")
            sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'app.db')
            app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{sqlite_path}"
            
            # Create the instance directory if it doesn't exist
            os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
except Exception as e:
    logging.error(f"Error configuring database: {str(e)}")
    # Ensure we have a default SQLite configuration
    sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'app.db')
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{sqlite_path}"
    
    # Create the instance directory if it doesn't exist
    os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max file size

# Initialize the app with the extension
db.init_app(app)

# Configure Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'  # type: ignore
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

with app.app_context():
    # Make sure to import the models here
    import models  # noqa: F401
    
    db.create_all()
