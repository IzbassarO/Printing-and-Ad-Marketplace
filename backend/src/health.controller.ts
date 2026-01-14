import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return { ok: true, name: 'marketplace-api' };
  }

  @Get('health')
  health() {
    return { ok: true };
  }
}
