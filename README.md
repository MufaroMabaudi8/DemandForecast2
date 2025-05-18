# Demand Forecasting System

A comprehensive forecasting system that provides product association analysis and demand predictions.

## Features

- User authentication system with login and registration
- Sales data upload and validation
- Association analysis using the Apriori algorithm
- Interactive visualizations for sales data and product associations
- Demand forecasting using XGBoost machine learning model

## Getting Started

### Prerequisites

Make sure you have Python 3.8+ installed on your system.

### Database Configuration

The application can work with either PostgreSQL or SQLite:

- **PostgreSQL**: Set the `DATABASE_URL` environment variable to your PostgreSQL connection string.
  ```
  export DATABASE_URL=postgresql://username:password@localhost:5432/dbname
  ```

- **SQLite**: If no PostgreSQL connection is available, the application will automatically use SQLite stored in the `instance` folder.

### Installation

1. Clone the repository:
   ```
   git clone [your-repository-url]
   cd [repository-folder]
   ```

2. Install required packages:
   ```
   pip install -r requirements.txt
   ```

3. Set up the database:
   ```
   python setup_database.py
   ```

### Running the Application

To start the application:

```
python run.py
```

The application will be available at `http://localhost:5000`.

## Usage

1. **Login/Registration**: Start by creating an account or logging in.
2. **Upload Data**: Navigate to the upload page to submit your sales data (CSV or Excel format).
3. **Analysis**: View association rules and visualizations on the analysis page.
4. **Forecasting**: Generate demand forecasts based on your sales data.

## Data Format

The system expects sales data with at least the following columns:
- Transaction ID
- Product Name
- Quantity
- Date

## Development

- For local development, you can use SQLite as the database.
- Set `DEBUG=True` in your environment for detailed error messages.

## License

[Your license here]

## Acknowledgments

- Developed by [Your Name or Organization]