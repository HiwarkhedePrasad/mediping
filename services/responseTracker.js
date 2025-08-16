// services/responseTracker.js - Track user responses to specific reminders
import MedicineReminder from "../model/remainder.js";
import { User } from "../model/index.js";

class ResponseTracker {
  constructor() {
    this.activeReminders = new Map(); // reminderId -> tracking info
    this.userReminders = new Map(); // userPhone -> [reminderIds]
  }

  // Add a reminder to tracking
  addReminder(reminderId, user, reminder) {
    const trackingInfo = {
      reminderId,
      userId: user.UserID,
      userPhone: user.PhoneNumber,
      userName: user.UserName,
      emergencyNumber: user.EmergencyNumber,
      medicine: reminder.Medicine,
      time: reminder.Time,
      sentAt: new Date(),
      responded: false,
      response: null,
      respondedAt: null,
      emergencyContacted: false,
      emergencyContactedAt: null,
    };

    this.activeReminders.set(reminderId, trackingInfo);

    // Track user's active reminders
    if (!this.userReminders.has(user.PhoneNumber)) {
      this.userReminders.set(user.PhoneNumber, []);
    }
    this.userReminders.get(user.PhoneNumber).push(reminderId);

    console.log(
      `📊 Added reminder ${reminderId} to tracking for user ${user.UserName}`
    );
    return trackingInfo;
  }

  // Get active reminder for a user
  getActiveReminder(userPhone) {
    const userReminderIds = this.userReminders.get(userPhone) || [];

    // Return the most recent active reminder
    for (let i = userReminderIds.length - 1; i >= 0; i--) {
      const reminderId = userReminderIds[i];
      const tracking = this.activeReminders.get(reminderId);

      if (tracking && !tracking.responded) {
        return tracking;
      }
    }

    return null;
  }

  // Handle user response to reminder
  handleResponse(userPhone, response) {
    const activeReminder = this.getActiveReminder(userPhone);

    if (!activeReminder) {
      console.log(`⚠️ No active reminder found for user ${userPhone}`);
      return false;
    }

    // Mark as responded
    activeReminder.responded = true;
    activeReminder.response = response;
    activeReminder.respondedAt = new Date();

    // Update tracking
    this.activeReminders.set(activeReminder.reminderId, activeReminder);

    console.log(
      `✅ User ${userPhone} responded to reminder ${activeReminder.reminderId}: ${response}`
    );
    return activeReminder;
  }

  // Check for response timeouts
  checkTimeouts(emergencyTimeout = 7 * 60 * 1000) {
    const now = new Date();
    const timeouts = [];

    for (const [reminderId, tracking] of this.activeReminders.entries()) {
      if (tracking.responded || tracking.emergencyContacted) {
        continue;
      }

      const timeSinceSent = now - tracking.sentAt;

      if (timeSinceSent >= emergencyTimeout) {
        timeouts.push(tracking);
      }
    }

    return timeouts;
  }

  // Mark emergency as contacted
  markEmergencyContacted(reminderId) {
    const tracking = this.activeReminders.get(reminderId);

    if (tracking) {
      tracking.emergencyContacted = true;
      tracking.emergencyContactedAt = new Date();
      this.activeReminders.set(reminderId, tracking);

      console.log(`🚨 Emergency contacted for reminder ${reminderId}`);
      return true;
    }

    return false;
  }

  // Get tracking statistics
  getStats() {
    const total = this.activeReminders.size;
    const responded = Array.from(this.activeReminders.values()).filter(
      (t) => t.responded
    ).length;
    const pending = Array.from(this.activeReminders.values()).filter(
      (t) => !t.responded && !t.emergencyContacted
    ).length;
    const emergencyContacted = Array.from(this.activeReminders.values()).filter(
      (t) => t.emergencyContacted
    ).length;

    return {
      total,
      responded,
      pending,
      emergencyContacted,
      responseRate: total > 0 ? ((responded / total) * 100).toFixed(1) : 0,
    };
  }

  // Get all active reminders
  getAllActive() {
    return Array.from(this.activeReminders.values());
  }

  // Get reminders for a specific user
  getUserReminders(userPhone) {
    const userReminderIds = this.userReminders.get(userPhone) || [];
    return userReminderIds
      .map((id) => this.activeReminders.get(id))
      .filter((tracking) => tracking !== undefined);
  }

  // Clean up old tracking data
  cleanup() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toRemove = [];

    for (const [reminderId, tracking] of this.activeReminders.entries()) {
      if (tracking.sentAt < oneDayAgo) {
        toRemove.push(reminderId);
      }
    }

    for (const reminderId of toRemove) {
      this.activeReminders.delete(reminderId);
    }

    // Clean up user reminders
    for (const [userPhone, reminderIds] of this.userReminders.entries()) {
      this.userReminders.set(
        userPhone,
        reminderIds.filter((id) => this.activeReminders.has(id))
      );

      // Remove user if no more reminders
      if (this.userReminders.get(userPhone).length === 0) {
        this.userReminders.delete(userPhone);
      }
    }

    console.log(`🧹 Cleaned up ${toRemove.length} old tracking entries`);
  }

  // Get reminder details for debugging
  getReminderDetails(reminderId) {
    return this.activeReminders.get(reminderId);
  }

  // Force mark reminder as responded (admin function)
  forceMarkResponded(reminderId, response = "admin_override") {
    const tracking = this.activeReminders.get(reminderId);

    if (tracking) {
      tracking.responded = true;
      tracking.response = response;
      tracking.respondedAt = new Date();
      this.activeReminders.set(reminderId, tracking);

      console.log(
        `🔧 Admin override: Reminder ${reminderId} marked as responded`
      );
      return true;
    }

    return false;
  }
}

// Create singleton instance
const responseTracker = new ResponseTracker();

export default responseTracker;
