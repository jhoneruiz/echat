import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("CompaniesSettings", "timezone", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "America/Sao_Paulo"
    });

    await queryInterface.sequelize.query(
      `UPDATE "CompaniesSettings" SET "timezone" = 'America/Sao_Paulo' WHERE "timezone" IS NULL`
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("CompaniesSettings", "timezone");
  }
};
