import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver-v2';
import { SocialProvider, User } from 'src/modules/users/user.entity';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor() {
    super({
      clientID: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      callbackURL:
        process.env.NAVER_CALLBACK_URL ||
        'http://localhost:3000/auth/naver/callback',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, email, name } = profile._json.response;

    let user = await User.findOne({
      where: [
        { email, provider: SocialProvider.NAVER },
        { providerId: id, provider: SocialProvider.NAVER },
      ],
    });

    if (!user) {
      // 기존 로컬 계정이 있는지 확인
      const existingUser = await User.findOne({
        where: { email, provider: SocialProvider.LOCAL },
      });

      if (existingUser) {
        // 기존 로컬 계정에 Naver 연동
        user = await User.save({
          ...existingUser,
          provider: SocialProvider.NAVER,
          providerId: id,
        });
      } else {
        // 새 사용자 생성
        user = User.create({
          email,
          name,
          provider: SocialProvider.NAVER,
          providerId: id,
        });
        await user.save();
      }
    }

    done(null, user);
  }
}
