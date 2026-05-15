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
  UpdatedAt,
} from "sequelize-typescript";
import Prompt from "./Prompt";
import Company from "./Company";

@Table
class PromptKnowledge extends Model<PromptKnowledge> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  // Tipo de item: text | url | image | pdf | audio | video
  @AllowNull(false)
  @Column({ defaultValue: "text" })
  type: string;

  // Contenido de texto (la respuesta o descripción)
  @AllowNull(true)
  @Column(DataType.TEXT)
  content: string;

  // URL externa (cuando type=url)
  @AllowNull(true)
  @Column
  url: string;

  // Ruta del archivo en el filesystem (cuando se subió un archivo)
  @AllowNull(true)
  @Column
  mediaPath: string;

  // MIME type del archivo
  @AllowNull(true)
  @Column
  mediaType: string;

  // Nombre original del archivo subido
  @AllowNull(true)
  @Column
  fileName: string;

  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

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

export default PromptKnowledge;
