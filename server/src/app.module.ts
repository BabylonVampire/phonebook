import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PhonebookController } from './phonebook.controller';
import { PhonebookService } from './phonebook.service';

@Module({
  controllers: [PhonebookController],
  providers: [DatabaseService, PhonebookService],
})
export class AppModule {}
