import express from "express";
import { User, Doctor } from "./model/index.js";
import client from "./twilioClient.js";
import { processMessage } from "./functionsCalling/gemini.js";
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

// Add user registration endpoint
app.post("/register", async (req, res) => {
  try {
    const { userName, phoneNumber, email, emergencyNumber, age, language } = req.body;
    
    if (!userName || !phoneNumber || !emergencyNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, phone number, and emergency number are required" 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { PhoneNumber: phoneNumber } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "User with this phone number already exists" 
      });
    }

    const newUser = await User.create({
      UserName: userName,
      PhoneNumber: phoneNumber,
      Email: email || null,
      EmergencyNumber: emergencyNumber,
      Age: age || null,
      Language: language || "English"
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: newUser
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration" 
    });
  }
});

let userHistories = {}; // key: userId

app.post("/whatsapp-web", async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;

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

app.listen(3000, () => console.log("Server running on port 3000"));
