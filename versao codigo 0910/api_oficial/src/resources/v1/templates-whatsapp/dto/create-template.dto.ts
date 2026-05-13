import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TTemplateCategory,
  TTemplateComponentType,
  TTemplateHeaderFormat,
  TTemplateButtonType,
} from 'src/@core/infra/meta/interfaces/IMeta.interfaces';

export class TemplateButtonDto {
  @ApiProperty({ enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'OTP', 'COPY_CODE'] })
  type: TTemplateButtonType;

  @ApiProperty()
  text: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  phone_number?: string;

  @ApiPropertyOptional({ type: [String] })
  example?: string[];
}

export class TemplateComponentExampleDto {
  @ApiPropertyOptional({ type: [String] })
  header_text?: string[];

  @ApiPropertyOptional({ type: [[String]] })
  body_text?: string[][];

  @ApiPropertyOptional({ type: [String] })
  header_handle?: string[];
}

export class TemplateComponentDto {
  @ApiProperty({ enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'] })
  type: TTemplateComponentType;

  @ApiPropertyOptional({ enum: ['TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'LOCATION'] })
  format?: TTemplateHeaderFormat;

  @ApiPropertyOptional()
  text?: string;

  @ApiPropertyOptional({ type: [TemplateButtonDto] })
  buttons?: TemplateButtonDto[];

  @ApiPropertyOptional({ type: TemplateComponentExampleDto })
  example?: TemplateComponentExampleDto;
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'saludo_inicial' })
  name: string;

  @ApiProperty({ example: 'es_MX' })
  language: string;

  @ApiProperty({ enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'] })
  category: TTemplateCategory;

  @ApiProperty({ type: [TemplateComponentDto] })
  components: TemplateComponentDto[];

  @ApiPropertyOptional({ default: false })
  allow_category_change?: boolean;
}

export class UpdateTemplateDto {
  @ApiProperty({ type: [TemplateComponentDto] })
  components: TemplateComponentDto[];
}
