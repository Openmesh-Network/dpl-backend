import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/database/prisma.service';
import { OpenmeshExpertsController } from './openmesh-experts.controller';
import { OpenmeshExpertsAuthService } from './openmesh-experts-auth.service';
import { UtilsModule } from 'src/utils/utils.module';

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
  controllers: [OpenmeshExpertsController],
  providers: [
    OpenmeshExpertsAuthService,
    PrismaService,
  ],
  exports: [OpenmeshExpertsAuthService],
})
export class OpenmeshExpertsModule {}
