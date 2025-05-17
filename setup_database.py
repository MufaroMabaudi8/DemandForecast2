"""
Database Setup Script for Demand Forecasting System

This script checks and initializes the database configuration for the application.
Run this script to verify your database connection before starting the application.
"""
import os
import sys
import logging
import sqlite3

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def check_database_config():
    """Check and verify the database configuration."""
    db_url = os.environ.get("DATABASE_URL")
    
    if db_url and db_url.startswith("postgres"):
        logging.info("PostgreSQL database URL found in environment variables.")
        try:
            # Only import if we need it to avoid errors if package is not installed
            import psycopg2
            
            # Parse the DATABASE_URL
            # Expected format: postgresql://user:password@host:port/dbname
            if '://' in db_url:
                # Remove the protocol part
                db_url = db_url.split('://', 1)[1]
            
            if '@' in db_url:
                auth, host_part = db_url.split('@', 1)
                user_pass = auth.split(':', 1) if ':' in auth else (auth, '')
                user = user_pass[0]
                password = user_pass[1] if len(user_pass) > 1 else ''
                
                if '/' in host_part:
                    host_port, dbname = host_part.split('/', 1)
                    if ':' in host_port:
                        host, port = host_port.split(':', 1)
                    else:
                        host = host_port
                        port = '5432'  # Default PostgreSQL port
                else:
                    host = host_part
                    port = '5432'
                    dbname = 'postgres'  # Default database name
                
                # Try to connect to PostgreSQL
                try:
                    conn = psycopg2.connect(
                        host=host,
                        port=port,
                        user=user,
                        password=password,
                        dbname=dbname
                    )
                    conn.close()
                    logging.info("✅ Successfully connected to PostgreSQL database.")
                    return True, "postgres"
                except Exception as e:
                    logging.error(f"❌ Could not connect to PostgreSQL database: {str(e)}")
                    logging.warning("Falling back to SQLite database.")
            else:
                logging.error("❌ Invalid PostgreSQL connection string format.")
                logging.warning("Falling back to SQLite database.")
        except ImportError:
            logging.error("❌ psycopg2 package not installed. Cannot use PostgreSQL.")
            logging.warning("Falling back to SQLite database.")
    else:
        logging.info("No PostgreSQL database URL found in environment variables.")
        logging.info("Configuring for SQLite database.")
    
    # Set up SQLite
    base_dir = os.path.abspath(os.path.dirname(__file__))
    instance_dir = os.path.join(base_dir, 'instance')
    os.makedirs(instance_dir, exist_ok=True)
    
    sqlite_path = os.path.join(instance_dir, 'app.db')
    
    # Test SQLite connection
    try:
        conn = sqlite3.connect(sqlite_path)
        conn.close()
        logging.info(f"✅ Successfully connected to SQLite database at {sqlite_path}")
        return True, "sqlite"
    except Exception as e:
        logging.error(f"❌ Could not connect to SQLite database: {str(e)}")
        return False, None

def setup_database():
    """Set up the database tables."""
    success, db_type = check_database_config()
    
    if not success:
        logging.error("Database configuration failed. Please fix the issues before running the application.")
        return False
    
    # Import and initialize models
    try:
        from app import app, db
        with app.app_context():
            db.create_all()
            logging.info("✅ Database tables created successfully.")
        return True
    except Exception as e:
        logging.error(f"❌ Error creating database tables: {str(e)}")
        return False

if __name__ == "__main__":
    print("\n===== Demand Forecasting System Database Setup =====\n")
    
    if setup_database():
        print("\n✅ Database setup completed successfully.")
        print("You can now run the application with: python main.py")
    else:
        print("\n❌ Database setup failed.")
        print("Please fix the issues mentioned above before running the application.")
    
    print("\n=====================================================\n")