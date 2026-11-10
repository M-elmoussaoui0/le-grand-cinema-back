import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Santé')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOkResponse({ description: "L'API et la base de données répondent." })
  async check() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'ok' };
  }
}
