import { join } from 'path';
import { promises as fs } from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import * as rateLimit from 'express-rate-limit';
import * as helmet from 'helmet';

const logger = new Logger('NestApplication', true);

function setupSwaggerUI(app: INestApplication): void {
  const plainApiVersion = process.env.API_PREFIX.split('/')[1].substr(1, 3);

  const apiSwaggerOptions = new DocumentBuilder()
    .setTitle(`Backend Template API`)
    .setDescription('The backend template API description. See available endpoints below.')
    .setContact('Peter Holzer', 'https://peterholzer.at', 'message@peterholzer.at')
    .setVersion(plainApiVersion)
    .addBearerAuth({ in: 'header', type: 'http' })
    .build();

  const apiDocument = SwaggerModule.createDocument(app, apiSwaggerOptions);
  SwaggerModule.setup(`${process.env.API_PREFIX}`, app, apiDocument);
}


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // todo enable security features below

  // app.use(
  //   rateLimit({
  //     windowMs: 15 * 60 * 1000, // 15 minutes
  //     max: 100, // limit each IP to 100 requests per windowMs
  //   }),
  // );

  // app.use(helmet());

  app.setGlobalPrefix(process.env.API_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      // prevents DTOs from being accepted with any properties
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  setupSwaggerUI(app);

  const port = process.env.PORT || process.env.APP_PORT;

  await app.listen(port);

  logger.log(`App is listening on port ${port}`);
}

bootstrap();
