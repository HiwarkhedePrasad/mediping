// user.js (or any model file)
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js"; // ES6 import

const Doctor = sequelize.define(
  "Doctor",
  {
    DoctorID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    Name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    PhoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    Specialization: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "Doctors",
    timestamps: false,
  }
);

export default Doctor;
