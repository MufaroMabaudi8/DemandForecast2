#!/usr/bin/env python3
"""
Run script for Demand Forecasting System

This script provides a simple way to start the application with proper initialization.
"""
import os
import sys
import logging
import subprocess

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def run_app():
    """Initialize the database and run the application."""
    print("\n===== Demand Forecasting System =====\n")
    
    # First, make sure the database is properly set up
    print("Setting up database...")
    try:
        from app import app, db
        with app.app_context():
            db.create_all()
            print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Error initializing database: {str(e)}")
        print("Please fix the database connection issues before continuing")
        sys.exit(1)
    
    # Run the application
    print("\nStarting application server...")
    try:
        from app import app
        import routes  # noqa: F401
        app.run(host="0.0.0.0", port=5000, debug=True)
    except Exception as e:
        print(f"❌ Error starting application: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_app()