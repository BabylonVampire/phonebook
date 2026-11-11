import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { PhonebookService, RecordData, REFERENCES } from './phonebook.service';

/** Controller: REST API, которое вызывает клиент (View). */
@Controller('api')
export class PhonebookController {
  constructor(private readonly model: PhonebookService) {}

  @Get('info')
  info() {
    return { ...this.model.info(), titles: Object.fromEntries(
      Object.entries(REFERENCES).map(([t, r]) => [t, r.title])) };
  }

  @Get('references')
  references() {
    return this.model.getReferenceData();
  }

  @Put('references/:table/:id')
  async updateReference(
    @Param('table') table: string,
    @Param('id', ParseIntPipe) id: number,
    @Body('value') value: string,
  ) {
    await this.model.updateReference(PhonebookService.checkTable(table), id, value);
    return { ok: true };
  }

  @Get('records')
  records(@Query() filters: Record<string, string>) {
    return this.model.search(filters);
  }

  @Post('records')
  async add(@Body() data: RecordData) {
    await this.model.addRecord(data);
    return { ok: true };
  }

  @Put('records/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: RecordData) {
    await this.model.updateRecord(id, data);
    return { ok: true };
  }

  @Delete('records/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.model.deleteRecord(id);
    return { ok: true };
  }
}
