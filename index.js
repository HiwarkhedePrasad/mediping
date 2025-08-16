import express from "express";
import { User, Doctor } from "./model/index.js";
import client from "./twilioClient.js";
import { processMessage } from "./functionsCalling/gemini.js";
import reminderScheduler from "./services/reminderScheduler.js";
import responseTracker from "./services/responseTracker.js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🧠 Store last 5 messages for each user
const userMemory = new Map();

function addToMemory(userId, role, content) {
  if (!userMemory.has(userId)) {
    userMemory.set(userId, []);
  }
  const history = userMemory.get(userId);

  // Add new message
  history.push({ role, content });

  // Keep only last 5 messages
  if (history.length > 5) {
    history.shift();
  }
}

app.get("/users", async (req, res) => {
  const users = await User.findAll({ include: Doctor });
  res.json(users);
});

// Get reminder tracking status
app.get("/reminder-status", (req, res) => {
  const status = reminderScheduler.getTrackingStatus();
  res.json(status);
});

// Get all active reminders
app.get("/active-reminders", (req, res) => {
  const activeReminders = responseTracker.getAllActive();
  res.json(activeReminders);
});

// Get reminders for a specific user
app.get("/user-reminders/:phoneNumber", (req, res) => {
  const { phoneNumber } = req.params;
  const userReminders = responseTracker.getUserReminders(phoneNumber);
  res.json(userReminders);
});

// Add user registration endpoint
app.post("/register", async (req, res) => {
  try {
    const { userName, phoneNumber, email, emergencyNumber, age, language } =
      req.body;

    if (!userName || !phoneNumber || !emergencyNumber) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number, and emergency number are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { PhoneNumber: phoneNumber },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists",
      });
    }

    const newUser = await User.create({
      UserName: userName,
      PhoneNumber: phoneNumber,
      Email: email || null,
      EmergencyNumber: emergencyNumber,
      Age: age || null,
      Language: language || "English",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

let userHistories = {}; // key: userId

app.post("/whatsapp-web", async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;

  console.log(`📱 WhatsApp message received from ${from}: "${body}"`);

  // Check if this is a response to a reminder
  const reminderResponse = await handleReminderResponse(from, body);

  if (reminderResponse) {
    // This was a reminder response, send confirmation
    res.send("<Response></Response>");
    return;
  }

  // Normal message processing
  if (!userHistories[from]) userHistories[from] = [];

  const reply = await processMessage(body, from, userHistories[from]);

  // Push to conversation history
  userHistories[from].push({ role: "user", content: body });
  userHistories[from].push({ role: "model", content: reply.text });

  if (process.env.NODE_ENV === "development") {
    console.log("Twilio mock send:", reply.text);
  } else {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: reply.text,
    });
  }

  res.send("<Response></Response>");
});

// Handle reminder responses
async function handleReminderResponse(from, body) {
  const response = body.trim().toLowerCase();

  // Check if this looks like a reminder response
  if (["taken", "remind later", "skip today"].includes(response)) {
    console.log(`💊 Processing reminder response: ${response}`);

    // Find the active reminder for this user
    const userPhone = from.replace(/^whatsapp:/, "");
    const activeReminder = responseTracker.getActiveReminder(userPhone);

    if (activeReminder) {
      console.log(
        `📊 Found active reminder ${activeReminder.reminderId} for user ${userPhone}`
      );

      // Handle the response using the reminder scheduler
      const success = reminderScheduler.handleUserResponse(
        activeReminder.reminderId,
        response,
        from
      );

      if (success) {
        console.log(`✅ Reminder response handled successfully`);
        return true;
      }
    } else {
      console.log(`⚠️ No active reminder found for user ${userPhone}`);
    }
  }

  return false;
}

// Start the reminder scheduler
reminderScheduler.start();

app.listen(3000, () => console.log("Server running on port 3000"));
