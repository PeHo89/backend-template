import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.RDS_HOSTNAME || process.env.DB_HOST,
        port: parseInt(process.env.RDS_PORT || process.env.DB_PORT),
        username: process.env.RDS_USERNAME || process.env.DB_USERNAME,
        password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
        database: process.env.RDS_DB_NAME || process.env.DB_DATABASE_NAME,
        entities: [join(__dirname, '**', '*.entity.{js,ts}')],
        synchronize: process.env.DB_SYNC === 'true',
      }),
    }),
    UserModule,
  ],
})
export class AppModule {}
