const { Sequelize } = require('sequelize');

const DB_PATH = process.env.DB_PATH || './dev.sqlite3';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
});

module.exports = sequelize;
