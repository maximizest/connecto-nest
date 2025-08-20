import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../auth/auth.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { ConnectionManagerService } from '../websocket/services/connection-manager.service';
import { AdminGuard } from '../../guards/admin.guard';
import { AuthGuard } from '../../guards/auth.guard';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AuthModule, // TokenBlacklistService, SessionManagerService 사용
    WebSocketModule, // ConnectionManagerService 사용
  ],
  controllers: [],
  providers: [ConnectionManagerService, AuthGuard, AdminGuard],
  exports: [],
})
export class AdminModule {}
