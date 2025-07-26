import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { Injectable } from '@nestjs/common';
import { User, SocialProvider, UserRole } from 'src/modules/users/user.entity';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    super({
      clientID: process.env.APPLE_CLIENT_ID!,
      teamID: process.env.APPLE_TEAM_ID!,
      keyID: process.env.APPLE_KEY_ID!,
      privateKeyString: process.env.APPLE_PRIVATE_KEY!,
      callbackURL: process.env.APPLE_CALLBACK_URL || 'http://localhost:3000/auth/apple/callback',
      scope: ['name', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { sub: id, email } = idToken;
    const name = profile?.displayName || '애플사용자';

    let user = await User.findOne({
      where: [
        { email, provider: SocialProvider.APPLE },
        { providerId: id, provider: SocialProvider.APPLE },
      ],
    });

    if (!user) {
      // 기존 로컬 계정이 있는지 확인
      const existingUser = email ? await User.findOne({
        where: { email, provider: SocialProvider.LOCAL },
      }) : null;

      if (existingUser) {
        // 기존 로컬 계정에 Apple 연동
        user = await User.save({
          ...existingUser,
          provider: SocialProvider.APPLE,
          providerId: id,
        });
      } else {
        // 새 사용자 생성
        user = User.create({
          email: email || `apple_${id}@apple.local`,
          name,
          provider: SocialProvider.APPLE,
          providerId: id,
          role: UserRole.USER,
        });
        await user.save();
      }
    }

    done(null, user);
  }
} 