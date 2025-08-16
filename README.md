# MediPing - WhatsApp Medicine Reminder System

A WhatsApp-based healthcare assistant that helps elderly patients manage their medications using AI (Google Gemini) and Twilio integration.

## Features

- 🤖 AI-powered natural language processing for medicine reminders
- 📱 WhatsApp integration via Twilio
- 💊 Medicine reminder management
- 👥 User and doctor management
- 🗄️ MySQL database with Sequelize ORM

## Prerequisites

- Node.js (v16 or higher)
- MySQL database
- Google Gemini API key
- Twilio account (for WhatsApp integration)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_NAME=ElderMedDB
DB_USER=root
DB_PASSWORD=root
DB_HOST=localhost

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# Environment
NODE_ENV=development
```

### 3. Database Setup

1. Create a MySQL database named `ElderMedDB`
2. Run the setup script to create tables and test data:

```bash
node setup.js
```

### 4. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### User Registration

```
POST /register
Content-Type: application/json

{
  "userName": "John Doe",
  "phoneNumber": "+1234567890",
  "email": "john@example.com",
  "emergencyNumber": "+1111111111",
  "age": 65,
  "language": "English"
}
```

### Get All Users

```
GET /users
```

### WhatsApp Webhook

```
POST /whatsapp-web
```

## Testing the Medicine Reminder Functionality

### 1. Using the Test Script

```bash
node test-reminder.js
```

### 2. Manual Testing via WhatsApp

1. Send a message to your Twilio WhatsApp number
2. Try these example messages:
   - "Remind me to take aspirin at 8:00 AM"
   - "Set a reminder for my blood pressure medicine at 9:30 PM"
   - "I need to take vitamin D at 7:00 AM daily"

### 3. Testing via API

You can also test the functionality by sending a POST request to the WhatsApp webhook:

```bash
curl -X POST http://localhost:3000/whatsapp-web \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+1234567890&Body=Remind me to take aspirin at 8:00 AM"
```

## How It Works

1. **User sends a message** via WhatsApp
2. **Gemini AI processes** the natural language request
3. **Function calling** extracts medicine name and time
4. **Database lookup** finds the user by phone number
5. **Reminder is saved** to the database
6. **Confirmation message** is sent back via WhatsApp

## Database Schema

### Users Table

- UserID (Primary Key)
- UserName
- PhoneNumber
- Email
- EmergencyNumber
- DoctorID (Foreign Key)
- Age
- Language

### Doctors Table

- DoctorID (Primary Key)
- Name
- PhoneNumber
- Email
- Specialization

### MedicineReminder Table

- ReminderID (Primary Key)
- UserID (Foreign Key)
- Time
- Medicine
- Response
- ReminderType (Daily/Weekly/Monthly)
- Duration

## Troubleshooting

### Common Issues

1. **"User not found" error**

   - Make sure the user is registered in the database
   - Check that the phone number format matches exactly

2. **Database connection error**

   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure the database exists

3. **Gemini API error**

   - Verify your API key is correct
   - Check API quota and billing

4. **Twilio error**
   - Verify Twilio credentials
   - Check WhatsApp number format (should start with `whatsapp:`)

### Debug Mode

Set `NODE_ENV=development` in your `.env` file to see detailed logs and mock Twilio responses.

## Project Structure

```
MediPing/
├── config/
│   └── db.js                 # Database configuration
├── controller/
│   └── remainder_controller.js # Medicine reminder controller
├── functionsCalling/
│   ├── gemini.js             # AI processing and function calling
│   ├── setMedicineReminder.js # Medicine reminder function
│   └── index.js              # Function registry
├── model/
│   ├── index.js              # Model associations
│   ├── user.js               # User model
│   ├── doctor.js             # Doctor model
│   └── remainder.js          # Medicine reminder model
├── tests/                    # Test suite
│   ├── README.md             # Test documentation
│   ├── setup.js              # Database setup script
│   ├── test-*.js             # Various test files
│   ├── verify-*.js           # Verification scripts
│   ├── update-database.js    # Database migration
│   └── cleanup-duplicates.js # Database cleanup
├── index.js                  # Main server file
├── twilioClient.js           # Twilio client configuration
└── package.json
```

## Testing

The project includes a comprehensive test suite located in the `tests/` folder. See [tests/README.md](tests/README.md) for detailed testing documentation.

### Quick Test Commands

```bash
# Setup database
node tests/setup.js

# Test enhanced reminder system
node tests/test-enhanced-reminders.js

# Local testing (no Twilio)
node tests/test-local-reminders.js

# Verify database state
node tests/verify-enhanced-reminders.js
```

### Test Categories

- **Core Functionality**: Medicine reminder creation and storage
- **User Registration**: Registration flow and validation
- **WhatsApp Integration**: Phone number handling and messaging
- **Language Support**: Indian language options
- **Database Operations**: Schema updates and data integrity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the test suite
5. Submit a pull request

## License

ISC License
