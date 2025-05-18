from app import app
import routes  # noqa: F401
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

if __name__ == "__main__":
    try:
        logging.info("Starting Demand Forecasting Application...")
        # Make sure the database tables are created
        from app import db
        with app.app_context():
            db.create_all()
            logging.info("Database tables initialized")
        
        # Run the Flask app
        logging.info("Starting server on 0.0.0.0:5000")
        app.run(host="0.0.0.0", port=5000, debug=True)
    except Exception as e:
        logging.error(f"Error starting application: {str(e)}")
        logging.error("Try running 'python setup_database.py' first to initialize the database")
