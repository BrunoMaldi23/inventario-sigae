import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '@inventario/types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../common/audit/audit.service';
import { invalidData, notFound } from '../common/exceptions/business.exception';

const AttachmentTypes = ['PHOTO', 'DOCUMENT', 'INVOICE', 'PURCHASE', 'ACT', 'DISPOSAL', 'OTHER'] as const;

class AttachmentBodyDto {
  @IsEnum(AttachmentTypes, { message: 'Tipo de adjunto inválido' })
  type!: (typeof AttachmentTypes)[number];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

@ApiTags('Adjuntos')
@ApiBearerAuth()
@Controller('assets/:assetId/attachments')
export class AttachmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Permissions('asset.read')
  @ApiOperation({ summary: 'Adjuntos de un bien' })
  async list(@Param('assetId') assetId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset) throw notFound('El bien no existe');
    const list = await this.prisma.assetAttachment.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    return list.map((a) => ({
      id: a.id,
      assetId: a.assetId,
      type: a.type,
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
      url: a.url,
      uploadedById: a.uploadedById,
      uploadedByName: a.uploadedBy?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  @Post()
  @Permissions('attachment.upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir adjunto (foto/documento)' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async upload(
    @Param('assetId') assetId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: AttachmentBodyDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw invalidData('Archivo no recibido');
    }
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset) throw notFound('El bien no existe');

    const saved = await this.storage.save(file.buffer, `assets/${asset.assetCode}`, file.originalname);

    const attachment = await this.prisma.assetAttachment.create({
      data: {
        assetId,
        type: body.type,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: saved.size,
        url: saved.url,
        key: saved.key,
        uploadedById: user.id,
      },
    });

    await this.audit.write(
      {
        userId: user.id,
        action: 'ATTACHMENT_UPLOAD',
        entityType: 'Asset',
        entityId: assetId,
        newValues: { filename: attachment.filename, type: attachment.type, url: attachment.url },
      },
      undefined,
    );

    return attachment;
  }

  @Delete(':attachmentId')
  @Permissions('attachment.delete')
  @ApiOperation({ summary: 'Eliminar adjunto' })
  async remove(
    @Param('assetId') assetId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const attachment = await this.prisma.assetAttachment.findFirst({
      where: { id: attachmentId, assetId },
    });
    if (!attachment) throw notFound('Adjunto no encontrado');

    if (attachment.key) this.storage.remove(attachment.key);

    await this.prisma.assetAttachment.delete({ where: { id: attachmentId } });
    await this.audit.write(
      {
        userId: user.id,
        action: 'ATTACHMENT_DELETE',
        entityType: 'Asset',
        entityId: assetId,
        oldValues: { filename: attachment.filename },
      },
      undefined,
    );
    return { success: true };
  }
}