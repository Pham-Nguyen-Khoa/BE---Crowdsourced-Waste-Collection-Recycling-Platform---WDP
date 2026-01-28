import { Body, Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Delete, Param } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger'
import { routesV1 } from 'src/configs/app.routes'
import { resourcesV1 } from 'src/configs/app.permission'
import { Permissions } from '../../auth/guards/permission.decorator'
import { JWTGuard } from '../../auth/guards/jwt.guard'
import { PermissionGuard } from '../../auth/guards/permissions.guard'
import { CreateReportMultipartDto } from '../dtos/create-report.dto'
import { GetUser } from 'src/modules/auth/guards/get-user.decorator'
import { CreateReportService } from '../services/create-report.service'
import { CancelReportDto } from '../dtos/cancel-report.dto'
import { User } from 'generated/prisma/client'

@ApiTags(`${resourcesV1.CREATE_REPORT.parent}`)
@Controller(routesV1.apiversion)
export class CreateReportController {
    constructor(private readonly createReportService: CreateReportService) { }

    @ApiOperation({ summary: resourcesV1.CREATE_REPORT.displayName })
    @ApiConsumes('multipart/form-data')
    @ApiBearerAuth()
    @UseGuards(JWTGuard, PermissionGuard)
    @Permissions('CREATE_REPORT')
    @UseInterceptors(FilesInterceptor('files'))
    @Post(routesV1.citizen.createReport)
    async createReport(
        @Body() data: CreateReportMultipartDto,
        @UploadedFiles() files: Express.Multer.File[],
        @GetUser() user
    ): Promise<any> {
        return await this.createReportService.createReport(data, user.id, files)
    }

    @ApiOperation({ summary: 'Hủy báo cáo rác' })
    @ApiBearerAuth()
    @UseGuards(JWTGuard)
    @Delete(routesV1.citizen.cancelReport)
    async cancelReport(@GetUser() user: User, @Param('id') reportId: number, @Body() dto: CancelReportDto) {
        return await this.createReportService.cancelReport(user.id, reportId, dto)
    }


}
