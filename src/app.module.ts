import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { UtilsModule } from './utils/utils.module';
import { OpenmeshExpertsModule } from './openmesh-experts/openmesh-experts.module';
import { XnodesModule } from './xnodes/xnodes.module';

@Module({
  imports: [
    XnodesModule,
    OpenmeshExpertsModule,
    UtilsModule,
    MulterModule.register({
      dest: './uploads',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
