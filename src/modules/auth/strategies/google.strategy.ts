import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { SocialProvider, User } from 'src/modules/users/user.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName } = profile;
    const email = emails[0].value;

    let user = await User.findOne({
      where: [
        { email, provider: SocialProvider.GOOGLE },
        { providerId: id, provider: SocialProvider.GOOGLE },
      ],
    });

    if (!user) {
      // 기존 로컬 계정이 있는지 확인
      const existingUser = await User.findOne({
        where: { email, provider: SocialProvider.LOCAL },
      });

      if (existingUser) {
        // 기존 로컬 계정에 Google 연동
        user = await User.save({
          ...existingUser,
          provider: SocialProvider.GOOGLE,
          providerId: id,
        });
      } else {
        // 새 사용자 생성
        user = User.create({
          email,
          name: displayName,
          provider: SocialProvider.GOOGLE,
          providerId: id,
        });
        await user.save();
      }
    }

    done(null, user);
  }
}
