// remainder.js (or any model file)
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js"; // ES6 import with default export
import User from "./user.js";

const MedicineReminder = sequelize.define(
  "MedicineReminder",
  {
    ReminderID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "UserID",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    Time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    Medicine: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Response: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ReminderType: {
      type: DataTypes.ENUM("one_time", "daily", "weekly", "monthly", "custom_range"),
      defaultValue: "daily",
    },
    Duration: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    StartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    EndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    Notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Frequency: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "MedicineReminder",
    timestamps: false,
  }
);

// Association
User.hasMany(MedicineReminder, { foreignKey: "UserID" });
MedicineReminder.belongsTo(User, { foreignKey: "UserID" });

export default MedicineReminder;
