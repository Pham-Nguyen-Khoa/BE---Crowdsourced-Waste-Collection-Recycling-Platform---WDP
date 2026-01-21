import { Body, Controller, Post, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger'
import { routesV1 } from 'src/configs/app.routes'
import { resourcesV1 } from 'src/configs/app.permission'
import { Permissions } from '../../auth/guards/permission.decorator'
import { JWTGuard } from '../../auth/guards/jwt.guard'
import { PermissionGuard } from '../../auth/guards/permissions.guard'
import { CreateReportMultipartDto } from '../dtos/create-report.dto'
import { CreateReportResponseDto } from '../dtos/create-report-response.dto'
import { EnterpriseResponseDto, EnterpriseResponseResponseDto } from '../dtos/enterprise-response.dto'
import { CitizenService } from '../services/citizen.service'
import { GetUser } from 'src/modules/auth/guards/get-user.decorator'

@ApiTags(`${resourcesV1.CREATE_REPORT.parent}`)
@Controller(routesV1.apiversion)
export class CitizenController {
    constructor(private readonly citizenService: CitizenService) { }

    @ApiOperation({ summary: resourcesV1.CREATE_REPORT.displayName })
    @ApiResponse({
        status: 201,
        description: 'Report created successfully',
        type: CreateReportResponseDto
    })
    @ApiConsumes('multipart/form-data')
    // @ApiBody({
    //     description: 'Report data with optional file uploads',
    //     type: CreateReportMultipartDto,
    // })
    @ApiBearerAuth()
    @UseGuards(JWTGuard, PermissionGuard)
    // @Permissions('CREATE_REPORT')
    @UseInterceptors(FilesInterceptor('files'))
    @Post(routesV1.citizen.createReport)
    async createReport(
        @Body() data: CreateReportMultipartDto,
        @UploadedFiles() files: Express.Multer.File[],
        @GetUser() user
    ): Promise<any> {
        // return "hello";

        return await this.citizenService.createReport(data, user.id, files)
    }

    @ApiOperation({ summary: 'Enterprise response to report' })
    @ApiResponse({
        status: 200,
        description: 'Response processed successfully',
        type: EnterpriseResponseResponseDto
    })
    @UseGuards(JWTGuard, PermissionGuard)
    // @Permissions('ENTERPRISE_RESPONSE') // Cần thêm permission này
    @Post('enterprise/report-response')
    async handleEnterpriseResponse(
        @Body() data: EnterpriseResponseDto,
        @GetUser() user
    ) {
        return "hello"
        // return await this.citizenService.handleEnterpriseResponse(data, user.id)
    }
}
