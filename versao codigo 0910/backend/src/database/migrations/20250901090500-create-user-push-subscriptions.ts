import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("UserPushSubscriptions", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      endpoint: {
        type: DataTypes.STRING(512),
        allowNull: false,
        unique: true
      },
      expirationTime: {
        type: DataTypes.DATE,
        allowNull: true
      },
      keysAuth: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      keysP256dh: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      platform: {
        type: DataTypes.STRING(32),
        allowNull: true
      },
      deviceInfo: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex("UserPushSubscriptions", ["userId"]);
    await queryInterface.addIndex("UserPushSubscriptions", ["companyId"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("UserPushSubscriptions");
  }
};
