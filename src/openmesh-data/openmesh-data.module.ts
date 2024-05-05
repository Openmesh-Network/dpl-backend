import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/database/prisma.service';
import { OpenmeshDataController } from './openmesh-data.controller';
import { OpenmeshDataService } from './openmesh-data.service';
import { UtilsModule } from 'src/utils/utils.module';
import { OpenmeshTemplateService } from './openmesh-template-products.service';
import { DomuService } from './domu.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule,
    UtilsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get('PRIVATE_ACCESS_KEY'),
          signOptions: { expiresIn: '2 days' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [OpenmeshDataController],
  providers: [
    OpenmeshDataService,
    OpenmeshTemplateService,
    DomuService,
    PrismaService,
  ],
  exports: [OpenmeshDataService],
})
export class OpenmeshDataModule {}
