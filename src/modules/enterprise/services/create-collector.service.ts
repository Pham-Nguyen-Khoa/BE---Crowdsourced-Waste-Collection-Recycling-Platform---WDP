import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/libs/prisma/prisma.service";
import { CreateCollectorDto } from "../dtos/create-collector.dto";



@Injectable()
export class CreateCollectorService {
    constructor(
        private readonly prisma: PrismaService
    ) { }
    async createCollector(userId: number, data: CreateCollectorDto) {
    }
}