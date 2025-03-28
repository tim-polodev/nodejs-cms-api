"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("articles", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true, // Set to false if this field is required
      },
      keywords: {
        type: Sequelize.JSONB,
        allowNull: false, // Set to false if this field is required
      },
      storage_prefix: {
        type: Sequelize.STRING,
        allowNull: true, // Set to false if this field is required
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("articles");
  },
};
