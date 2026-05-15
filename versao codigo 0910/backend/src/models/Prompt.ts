import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import Queue from "./Queue";
import Company from "./Company";

@Table
class Prompt extends Model<Prompt> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  prompt: string;

  @AllowNull(false)
  @Column
  apiKey: string;

  @Column({ defaultValue: 10 })
  maxMessages: number;

  @Column({ defaultValue: 100 })
  maxTokens: number;

  @Column({ defaultValue: 1 })
  temperature: number;

  @Column({ defaultValue: 0 })
  promptTokens: number;

  @Column({ defaultValue: 0 })
  completionTokens: number;

  @Column({ defaultValue: 0 })
  totalTokens: number;

  @AllowNull(false)
  @Column
  voice: string;

  @AllowNull(true)
  @Column
  voiceKey:string;

  @AllowNull(true)
  @Column
  voiceRegion:string;

  @Column({ defaultValue: "gpt-4o-mini" })
  model: string;

  @Column({ defaultValue: "general" })
  agentFunction: string;

  @Column({ defaultValue: "friendly" })
  tone: string;

  @Column({ defaultValue: "es" })
  languages: string;

  @Column({ defaultValue: true })
  isActive: boolean;

  @AllowNull(true)
  @Column
  initialMessage: string;

  @AllowNull(true)
  @Column
  responseRules: string;

  @Column({ defaultValue: true })
  allowTransfer: boolean;

  @AllowNull(true)
  @Column
  transferKeywords: string;

  @AllowNull(true)
  @Column
  transferMessage: string;

  @Column({ defaultValue: 1 })
  responseDelay: number;

  @Column({ defaultValue: 2000 })
  charLimit: number;

  @Column({ defaultValue: true })
  humanize: boolean;

  @Column({ defaultValue: false })
  useAudio: boolean;

  @AllowNull(true)
  @Column(DataType.TEXT)
  knowledge: string;

  @AllowNull
  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

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

export default Prompt;
