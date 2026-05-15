import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  // Nota: la tabla se llama "TicketTraking" (singular, con typo legacy del fork).
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("TicketTraking", "pendingAlertSentAt", {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("TicketTraking", "pendingAlertSentAt");
  },
};
