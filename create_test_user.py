from app import app, db
from models import User

def create_test_user():
    with app.app_context():
        # Check if test user already exists
        test_user = User.query.filter_by(email='test@example.com').first()
        if not test_user:
            # Create test user
            test_user = User()
            test_user.fullname = 'Test User'
            test_user.email = 'test@example.com'
            test_user.set_password('password123')
            
            db.session.add(test_user)
            db.session.commit()
            print("Test user created successfully!")
        else:
            print("Test user already exists.")

if __name__ == '__main__':
    create_test_user()