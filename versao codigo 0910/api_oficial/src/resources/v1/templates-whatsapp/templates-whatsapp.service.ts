import { Injectable, Logger } from '@nestjs/common';
import { MetaService } from 'src/@core/infra/meta/meta.service';
import { WhatsappOficialService } from '../whatsapp-oficial/whatsapp-oficial.service';
import { AppError } from 'src/@core/infra/errors/app.error';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesWhatsappService {
  logger = new Logger(`${TemplatesWhatsappService}`);

  constructor(
    private readonly whatsappOficial: WhatsappOficialService,
    private readonly metaService: MetaService,
  ) {}

  private async findConexao(token: string) {
    const conexao =
      await this.whatsappOficial.prisma.whatsappOficial.findUnique({
        where: { token_mult100: token, deleted_at: null },
      });

    if (!conexao) {
      throw new Error(`Nenhuma conexão existente com este token ${token}`);
    }

    return conexao;
  }

  async findAll(token: string) {
    try {
      const conexao = await this.findConexao(token);

      return await this.metaService.getListTemplates(
        conexao.waba_id,
        conexao.send_token,
      );
    } catch (error: any) {
      this.logger.error(`findAll - ${error.message}`);
      throw new AppError(error.message);
    }
  }

  async create(token: string, dto: CreateTemplateDto) {
    try {
      const conexao = await this.findConexao(token);

      return await this.metaService.createTemplate(
        conexao.waba_id,
        conexao.send_token,
        dto,
      );
    } catch (error: any) {
      this.logger.error(`create - ${error.message}`);
      throw new AppError(error.message);
    }
  }

  async update(token: string, templateId: string, dto: UpdateTemplateDto) {
    try {
      const conexao = await this.findConexao(token);

      return await this.metaService.updateTemplate(
        templateId,
        conexao.send_token,
        dto,
      );
    } catch (error: any) {
      this.logger.error(`update - ${error.message}`);
      throw new AppError(error.message);
    }
  }

  async remove(token: string, templateName: string) {
    try {
      const conexao = await this.findConexao(token);

      return await this.metaService.deleteTemplate(
        conexao.waba_id,
        templateName,
        conexao.send_token,
      );
    } catch (error: any) {
      this.logger.error(`remove - ${error.message}`);
      throw new AppError(error.message);
    }
  }
}
