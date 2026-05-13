import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  DataType
} from "sequelize-typescript";

import User from "./User";
import Company from "./Company";

@Table({ tableName: "UserPushSubscriptions" })
class UserPushSubscription extends Model<UserPushSubscription> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.STRING(512))
  endpoint: string;

  @Column(DataType.DATE)
  expirationTime: Date | null;

  @Column(DataType.STRING)
  keysAuth: string;

  @Column(DataType.STRING)
  keysP256dh: string;

  @Column(DataType.STRING)
  platform: string | null;

  @Column(DataType.TEXT)
  deviceInfo: string | null;

  @Column(DataType.DATE)
  lastUsedAt: Date | null;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default UserPushSubscription;
