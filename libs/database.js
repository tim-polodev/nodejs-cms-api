import Sequelize from "sequelize";

const {
  DB_HOST = "localhost",
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_PORT = 5432,
} = process.env;

if (!DB_NAME || !DB_USER || !DB_PASSWORD) {
  throw new Error("Missing databse configurations");
}
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: "postgres",
  port: DB_PORT,
});

export default sequelize;
