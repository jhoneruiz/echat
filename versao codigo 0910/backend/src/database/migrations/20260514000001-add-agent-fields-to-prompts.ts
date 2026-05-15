import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Prompts", "model", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "gpt-4o-mini"
    });
    await queryInterface.addColumn("Prompts", "agentFunction", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "general"
    });
    await queryInterface.addColumn("Prompts", "tone", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "friendly"
    });
    await queryInterface.addColumn("Prompts", "languages", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "es"
    });
    await queryInterface.addColumn("Prompts", "isActive", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn("Prompts", "initialMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Prompts", "responseRules", {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn("Prompts", "allowTransfer", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn("Prompts", "transferKeywords", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "agente, salir, hablar con humano, humano"
    });
    await queryInterface.addColumn("Prompts", "transferMessage", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue:
        "Disculpa, no tengo información sobre este tema. Te transferiré a un agente."
    });
    await queryInterface.addColumn("Prompts", "responseDelay", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await queryInterface.addColumn("Prompts", "charLimit", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2000
    });
    await queryInterface.addColumn("Prompts", "humanize", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn("Prompts", "useAudio", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Prompts", "model");
    await queryInterface.removeColumn("Prompts", "agentFunction");
    await queryInterface.removeColumn("Prompts", "tone");
    await queryInterface.removeColumn("Prompts", "languages");
    await queryInterface.removeColumn("Prompts", "isActive");
    await queryInterface.removeColumn("Prompts", "initialMessage");
    await queryInterface.removeColumn("Prompts", "responseRules");
    await queryInterface.removeColumn("Prompts", "allowTransfer");
    await queryInterface.removeColumn("Prompts", "transferKeywords");
    await queryInterface.removeColumn("Prompts", "transferMessage");
    await queryInterface.removeColumn("Prompts", "responseDelay");
    await queryInterface.removeColumn("Prompts", "charLimit");
    await queryInterface.removeColumn("Prompts", "humanize");
    await queryInterface.removeColumn("Prompts", "useAudio");
  }
};
