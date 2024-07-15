import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/database/prisma.service';
import { UtilsModule } from 'src/utils/utils.module';
import { OpenmeshExpertsModule } from 'src/openmesh-experts/openmesh-experts.module';
import { XnodesService } from './xnodes.service';
import { XnodesController } from './xnodes.controller';
import { TestingService } from './testing.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule,
    OpenmeshExpertsModule,
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
  controllers: [XnodesController],
  providers: [XnodesService, PrismaService, TestingService],
  exports: [XnodesService, TestingService],
})
export class XnodesModule {}
