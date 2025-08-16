// db.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "ElderMedDB",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "root",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  }
);

export default sequelize;
