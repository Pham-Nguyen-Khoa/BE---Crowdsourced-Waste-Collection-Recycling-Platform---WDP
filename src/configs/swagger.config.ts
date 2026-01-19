

import { INestApplication, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function serializeBigInt(obj) {
    return JSON.parse(
        JSON.stringify(obj, (key, value) =>
            typeof value === 'bigint' ? Number(value) : value,
        ),
    );
}

export function setupSwagger(nestApp: INestApplication) {
    console.log('>>> Setting up Swagger');
    const options = new DocumentBuilder()
        .setTitle('WDP BE API')
        .setDescription('Crowdsourced Waste Collection & Recycling Platform API Documentation')
        .setVersion('1.1')
        .addBearerAuth();
    const document = SwaggerModule.createDocument(nestApp, options.build());
    const serializedDocument = serializeBigInt(document);
    SwaggerModule.setup('docs', nestApp, serializedDocument, {
        swaggerOptions: {
            tagsSorter: 'alpha',
            displayOperationId: true,
            displayRequestDuration: true,
            filter: true,
        },
    });
}