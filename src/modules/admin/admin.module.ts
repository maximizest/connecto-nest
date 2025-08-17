import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdminController } from './api/v1/admin.controller';
import { User } from '../user/user.entity';
import { AuthModule } from '../auth/auth.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { ConnectionManagerService } from '../websocket/services/connection-manager.service';
import { EnhancedAuthGuard } from '../../guards/enhanced-auth.guard';
import { AdminGuard } from '../../guards/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EventEmitterModule.forRoot(),
    AuthModule, // TokenBlacklistService, SessionManagerService 사용
    WebSocketModule, // ConnectionManagerService 사용
  ],
  controllers: [AdminController],
  providers: [
    ConnectionManagerService,
    EnhancedAuthGuard,
    AdminGuard,
  ],
  exports: [],
})
export class AdminModule {}