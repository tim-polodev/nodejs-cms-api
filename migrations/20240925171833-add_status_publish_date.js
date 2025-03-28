"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("articles", "status", {
      type: Sequelize.ENUM,
      values: ["hidden", "published", "delisted"],
      allowNull: false,
      defaultValue: "hidden",
    });
    await queryInterface.addColumn("articles", "publish_on", {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    });

    await queryInterface.addColumn("articles", "publish_to", {
      type: Sequelize.DATE,
      defaultValue: null,
      allowNull: true, // If this null, the article will always be published
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("articles", "status");
    await queryInterface.removeColumn("articles", "publish_on");
    await queryInterface.removeColumn("articles", "publish_to");
  },
};
