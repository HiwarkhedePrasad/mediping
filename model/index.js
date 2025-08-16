// models/index.js
import sequelize from "../config/db.js"; // sequelize instance
import User from "./user.js";
import Doctor from "./doctor.js";
import MedicineReminder from "./remainder.js";
// Define associations
Doctor.hasMany(User, { foreignKey: "DoctorID" });
User.belongsTo(Doctor, { foreignKey: "DoctorID" });

User.hasMany(MedicineReminder, { foreignKey: "UserID" });
MedicineReminder.belongsTo(User, { foreignKey: "UserID" });

// Sync models (creates tables if not exist)
sequelize
  .sync({ alter: true })
  .then(() => console.log("Database synced with models"))
  .catch((err) => console.error("Error syncing database:", err));

// Export models
export { User, Doctor, sequelize };
