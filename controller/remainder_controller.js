const MedicineReminder = require("../model/remainder");

exports.createReminder = async (req, res) => {
  try {
    const { UserID, Time, Medicine, Duration, ReminderType } = req.body;

    if (!UserID || !Time || !Medicine) {
      return res
        .status(400)
        .json({ message: "UserID, Time, and Medicine are required" });
    }

    const newReminder = await MedicineReminder.create({
      UserID,
      Time,
      Medicine,
      Duration: Duration || 1,
      ReminderType: ReminderType || "Daily",
    });

    res.status(201).json({
      message: "Reminder created successfully",
      reminder: newReminder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllReminders = async (req, res) => {
  try {
    const reminders = await MedicineReminder.findAll();
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateReminderResponse = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { Response } = req.body;

    const reminder = await MedicineReminder.findByPk(reminderId);
    if (!reminder)
      return res.status(404).json({ message: "Reminder not found" });

    reminder.Response = Response;
    await reminder.save();

    res.json({ message: "Reminder response updated", reminder });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
