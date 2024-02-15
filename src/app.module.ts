import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './tasks/tasks.module';
import { MulterModule } from '@nestjs/platform-express';
import { EventsHandlerModule } from './eventsHandler/events-handler.module';
import { UtilsModule } from './utils/utils.module';
import { UsersModule } from './users/users.module';
import { DepartamentsModule } from './departaments/departaments.module';
import { OpenmeshExpertsModule } from './openmesh-experts/openmesh-experts.module';
import { OpenmeshDataModule } from './openmesh-data/openmesh-data.module';
import { XnodesModule } from './xnodes/xnodes.module';
import { JobsModule } from './jobs/jobs.module';
import { PythiaModule } from './pythia/pythia.module';

@Module({
  imports: [
    TasksModule,
    DepartamentsModule,
    UsersModule,
    XnodesModule,
    OpenmeshExpertsModule,
    OpenmeshDataModule,
    PythiaModule,
    UtilsModule,
    EventsHandlerModule,
    JobsModule,
    MulterModule.register({
      dest: './uploads',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
