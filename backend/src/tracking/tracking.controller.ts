import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';

@ApiTags('Public Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get(':trackingNumber')
  @ApiOperation({ summary: 'Track a shipment by tracking number (Public)' })
  @ApiResponse({ status: 200, description: 'Tracking history and current status returned' })
  async getTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getTrackingByNumber(trackingNumber);
  }
}
