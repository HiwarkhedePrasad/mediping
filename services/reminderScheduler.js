// services/reminderScheduler.js - Comprehensive reminder scheduling system
import cron from "node-cron";
import client from "../twilioClient.js";
import { User, Doctor } from "../model/index.js";
import MedicineReminder from "../model/remainder.js";
import responseTracker from "./responseTracker.js";
import dotenv from "dotenv";

dotenv.config();

class ReminderScheduler {
  constructor() {
    this.isRunning = false;
    this.emergencyTimeout = 7 * 60 * 1000; // 7 minutes in milliseconds
  }

  // Start the reminder scheduler
  start() {
    if (this.isRunning) {
      console.log("⚠️ Reminder scheduler is already running");
      return;
    }

    console.log("🚀 Starting Reminder Scheduler...");

    // Schedule reminder checks every minute
    cron.schedule("* * * * *", () => {
      this.checkAndSendReminders();
    });

    // Schedule response tracking checks every 30 seconds
    cron.schedule("*/30 * * * * *", () => {
      this.checkResponseTimeouts();
    });

    this.isRunning = true;
    console.log("✅ Reminder Scheduler started successfully");
  }

  // Stop the reminder scheduler
  stop() {
    if (!this.isRunning) {
      console.log("⚠️ Reminder scheduler is not running");
      return;
    }

    console.log("🛑 Stopping Reminder Scheduler...");
    this.isRunning = false;
    console.log("✅ Reminder Scheduler stopped");
  }

  // Check and send reminders for current time
  async checkAndSendReminders() {
    try {
      const currentTime = new Date();
      const currentTimeString = currentTime.toTimeString().slice(0, 5); // HH:MM format
      const currentDate = currentTime.toISOString().split("T")[0]; // YYYY-MM-DD format

      console.log(
        `🔍 Checking reminders for time: ${currentTimeString}, date: ${currentDate}`
      );

      // Find all active reminders for current time
      const reminders = await MedicineReminder.findAll({
        include: [
          {
            model: User,
            attributes: [
              "UserName",
              "PhoneNumber",
              "EmergencyNumber",
              "Language",
            ],
          },
        ],
        where: {
          Time: currentTimeString,
        },
      });

      for (const reminder of reminders) {
        await this.processReminder(reminder, currentDate);
      }
    } catch (error) {
      console.error("❌ Error checking reminders:", error);
    }
  }

  // Process individual reminder
  async processReminder(reminder, currentDate) {
    try {
      const user = reminder.User;
      const reminderId = reminder.ReminderID;

      // Check if reminder should be sent based on type and dates
      if (!this.shouldSendReminder(reminder, currentDate)) {
        return;
      }

      console.log(`💊 Processing reminder ${reminderId} for ${user.UserName}`);

      // Send WhatsApp message to user
      const messageSent = await this.sendReminderMessage(user, reminder);

      if (messageSent) {
        // Track this reminder for response monitoring
        this.trackReminder(reminderId, user, reminder);

        console.log(`✅ Reminder ${reminderId} sent to ${user.UserName}`);
      }
    } catch (error) {
      console.error(
        `❌ Error processing reminder ${reminder.ReminderID}:`,
        error
      );
    }
  }

  // Check if reminder should be sent based on type and dates
  shouldSendReminder(reminder, currentDate) {
    switch (reminder.ReminderType) {
      case "one_time":
        return reminder.StartDate === currentDate;

      case "daily":
        return true; // Send every day

      case "weekly":
        const reminderDate = new Date(reminder.StartDate);
        const current = new Date(currentDate);
        const daysDiff = Math.floor(
          (current - reminderDate) / (1000 * 60 * 60 * 24)
        );
        return daysDiff % 7 === 0; // Every 7 days

      case "monthly":
        const reminderDay = new Date(reminder.StartDate).getDate();
        const currentDay = new Date(currentDate).getDate();
        return reminderDay === currentDay; // Same day of month

      case "custom_range":
        return (
          currentDate >= reminder.StartDate && currentDate <= reminder.EndDate
        );

      default:
        return false;
    }
  }

  // Send reminder message via WhatsApp
  async sendReminderMessage(user, reminder) {
    try {
      const message = this.generateReminderMessage(user, reminder);
      const phoneNumber = `whatsapp:${user.PhoneNumber}`;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `📱 [DEV] Would send WhatsApp message to ${user.PhoneNumber}:`
        );
        console.log(`   ${message}`);
        return true;
      }

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: phoneNumber,
        body: message,
      });

      return true;
    } catch (error) {
      console.error(
        `❌ Error sending reminder message to ${user.UserName}:`,
        error
      );
      return false;
    }
  }

  // Generate personalized reminder message
  generateReminderMessage(user, reminder) {
    const time = reminder.Time;
    const medicine = reminder.Medicine;
    const notes = reminder.Notes;

    let message = `⏰ **Medicine Reminder** ⏰\n\n`;
    message += `Hello ${user.UserName}! 👋\n\n`;
    message += `It's time to take your medicine:\n`;
    message += `💊 **${medicine}** at **${time}**\n\n`;

    if (notes) {
      message += `📝 **Notes:** ${notes}\n\n`;
    }

    message += `Please reply with:\n`;
    message += `✅ "Taken" - if you've taken the medicine\n`;
    message += `⏰ "Remind later" - to be reminded in 30 minutes\n`;
    message += `❌ "Skip today" - if you want to skip this dose\n\n`;
    message += `⚠️ **Important:** If you don't respond within 7 minutes, we'll contact your emergency contact.`;

    return message;
  }

  // Track reminder for response monitoring
  trackReminder(reminderId, user, reminder) {
    // Use response tracker
    const trackingInfo = responseTracker.addReminder(
      reminderId,
      user,
      reminder
    );

    // Set timeout for emergency contact
    setTimeout(() => {
      this.checkAndContactEmergency(reminderId);
    }, this.emergencyTimeout);

    console.log(`📊 Tracking reminder ${reminderId} for user ${user.UserName}`);
  }

  // Check response timeouts and contact emergency if needed
  async checkResponseTimeouts() {
    const timeouts = responseTracker.checkTimeouts(this.emergencyTimeout);

    for (const tracking of timeouts) {
      await this.contactEmergency(tracking.reminderId, tracking);
    }
  }

  // Contact emergency number
  async contactEmergency(reminderId, tracking) {
    try {
      if (tracking.emergencyContacted) {
        return; // Already contacted
      }

      console.log(`🚨 Emergency contact needed for reminder ${reminderId}`);

      const emergencyMessage = this.generateEmergencyMessage(tracking);

      if (process.env.NODE_ENV === "development") {
        console.log(
          `📱 [DEV] Would send emergency message to ${tracking.emergencyNumber}:`
        );
        console.log(`   ${emergencyMessage}`);
      } else {
        // Send SMS to emergency number (not WhatsApp)
        await client.messages.create({
          from:
            process.env.TWILIO_PHONE_NUMBER ||
            process.env.TWILIO_WHATSAPP_NUMBER,
          to: tracking.emergencyNumber,
          body: emergencyMessage,
        });
      }

      // Mark as contacted using response tracker
      responseTracker.markEmergencyContacted(reminderId);

      console.log(`✅ Emergency contact sent for reminder ${reminderId}`);
    } catch (error) {
      console.error(
        `❌ Error contacting emergency for reminder ${reminderId}:`,
        error
      );
    }
  }

  // Generate emergency message
  generateEmergencyMessage(tracking) {
    return (
      `🚨 **EMERGENCY ALERT** 🚨\n\n` +
      `Your emergency contact ${
        tracking.userName || "family member"
      } has not responded to their medicine reminder.\n\n` +
      `📋 **Details:**\n` +
      `💊 Medicine: ${tracking.medicine}\n` +
      `⏰ Time: ${tracking.time}\n` +
      `📱 User Phone: ${tracking.userPhone}\n\n` +
      `Please check on them immediately and ensure they take their medicine.\n\n` +
      `This is an automated alert from MediPing.`
    );
  }

  // Handle user response to reminder
  handleUserResponse(reminderId, response, userPhone) {
    const userPhoneClean = userPhone.replace(/^whatsapp:/, "");

    // Use response tracker to handle the response
    const tracking = responseTracker.handleResponse(userPhoneClean, response);

    if (!tracking) {
      console.log(`⚠️ No active reminder found for user ${userPhoneClean}`);
      return false;
    }

    console.log(
      `✅ User responded to reminder ${tracking.reminderId}: ${response}`
    );

    // Send confirmation message
    this.sendResponseConfirmation(userPhone, response, tracking);

    return true;
  }

  // Send confirmation message for user response
  async sendResponseConfirmation(userPhone, response, tracking) {
    try {
      let confirmationMessage = "";

      switch (response.toLowerCase()) {
        case "taken":
          confirmationMessage = `✅ **Medicine Taken!**\n\nGreat job! You've taken your ${tracking.medicine}. Stay healthy! 💪`;
          break;
        case "remind later":
          confirmationMessage = `⏰ **Reminder Set!**\n\nI'll remind you again in 30 minutes to take your ${tracking.medicine}.`;
          // Schedule reminder for 30 minutes later
          setTimeout(() => {
            this.sendReminderMessage(
              { PhoneNumber: tracking.userPhone },
              { Medicine: tracking.medicine, Time: tracking.time }
            );
          }, 30 * 60 * 1000);
          break;
        case "skip today":
          confirmationMessage = `❌ **Dose Skipped**\n\nYou've chosen to skip today's dose of ${tracking.medicine}. Please consult your doctor if this becomes a pattern.`;
          break;
        default:
          confirmationMessage = `📝 **Response Received**\n\nThank you for responding. Please remember to take your medicine as prescribed.`;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`📱 [DEV] Would send confirmation to ${userPhone}:`);
        console.log(`   ${confirmationMessage}`);
      } else {
        await client.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: userPhone,
          body: confirmationMessage,
        });
      }
    } catch (error) {
      console.error("❌ Error sending confirmation message:", error);
    }
  }

  // Get current tracking status
  getTrackingStatus() {
    return responseTracker.getStats();
  }

  // Clear old tracking data
  clearOldTracking() {
    responseTracker.cleanup();
  }
}

// Create singleton instance
const reminderScheduler = new ReminderScheduler();

export default reminderScheduler;
