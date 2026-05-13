import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TemplatesWhatsappService } from './templates-whatsapp.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('v1/templates-whatsapp')
@ApiBearerAuth()
@ApiTags('Templates WhatsApp')
export class TemplatesWhatsappController {
  constructor(private readonly service: TemplatesWhatsappService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Lista todos los templates de la conexión' })
  @ApiResponse({ status: 200, description: 'Lista de templates de Meta' })
  @ApiResponse({ status: 400, description: 'Conexión no encontrada o error Meta' })
  findAll(@Param('token') token: string) {
    return this.service.findAll(token);
  }

  @Post(':token')
  @ApiOperation({ summary: 'Crea un nuevo template en Meta' })
  @ApiResponse({ status: 201, description: 'Template creado (status: PENDING)' })
  @ApiResponse({ status: 400, description: 'Error de validación o conexión no encontrada' })
  create(
    @Param('token') token: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.service.create(token, dto);
  }

  @Patch(':token/:templateId')
  @ApiOperation({ summary: 'Edita los componentes de un template existente' })
  @ApiResponse({ status: 200, description: 'Template actualizado (vuelve a PENDING para revisión)' })
  @ApiResponse({ status: 400, description: 'Error al actualizar o conexión no encontrada' })
  update(
    @Param('token') token: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.service.update(token, templateId, dto);
  }

  @Delete(':token/:templateName')
  @ApiOperation({ summary: 'Elimina un template de Meta por nombre' })
  @ApiResponse({ status: 200, description: 'Template eliminado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al eliminar o conexión no encontrada' })
  remove(
    @Param('token') token: string,
    @Param('templateName') templateName: string,
  ) {
    return this.service.remove(token, templateName);
  }
}
