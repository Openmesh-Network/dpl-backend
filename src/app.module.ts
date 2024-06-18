import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { UtilsModule } from './utils/utils.module';
import { UsersModule } from './users/users.module';
import { DepartamentsModule } from './departaments/departaments.module';
import { OpenmeshExpertsModule } from './openmesh-experts/openmesh-experts.module';
import { OpenmeshDataModule } from './openmesh-data/openmesh-data.module';
import { XnodesModule } from './xnodes/xnodes.module';

@Module({
  imports: [
    DepartamentsModule,
    UsersModule,
    XnodesModule,
    OpenmeshExpertsModule,
    OpenmeshDataModule,
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
