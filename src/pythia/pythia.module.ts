import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/database/prisma.service';
import { UtilsModule } from 'src/utils/utils.module';
import { UsersModule } from 'src/users/users.module';
import { OpenmeshExpertsModule } from 'src/openmesh-experts/openmesh-experts.module';
import { PythiaService } from './pythia.service';
import { PythiaController } from './pythia.controller';
import { LLMInstanceService } from './llm/llm.service';
import { DeployerService } from './llm/deployer.service';
import { ChatbotService } from './llm/chatbot.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule,
    UsersModule,
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
  controllers: [PythiaController],
  providers: [
    PythiaService,
    LLMInstanceService,
    DeployerService,
    ChatbotService,
    PrismaService,
  ],
  exports: [PythiaService, LLMInstanceService, ChatbotService, DeployerService],
})
export class PythiaModule {}
