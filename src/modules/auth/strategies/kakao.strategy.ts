import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { SocialProvider, User } from 'src/modules/users/user.entity';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor() {
    super({
      clientID: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
      callbackURL:
        process.env.KAKAO_CALLBACK_URL ||
        'http://localhost:3000/auth/kakao/callback',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, _json } = profile;
    const email = _json.kakao_account?.email;
    const name = _json.kakao_account?.profile?.nickname || '카카오사용자';

    let user = await User.findOne({
      where: [
        { email, provider: SocialProvider.KAKAO },
        { providerId: String(id), provider: SocialProvider.KAKAO },
      ],
    });

    if (!user) {
      // 기존 로컬 계정이 있는지 확인
      const existingUser = email
        ? await User.findOne({
            where: { email, provider: SocialProvider.LOCAL },
          })
        : null;

      if (existingUser) {
        // 기존 로컬 계정에 Kakao 연동
        user = await User.save({
          ...existingUser,
          provider: SocialProvider.KAKAO,
          providerId: String(id),
        });
      } else {
        // 새 사용자 생성
        user = User.create({
          email: email || `kakao_${id}@kakao.local`,
          name,
          provider: SocialProvider.KAKAO,
          providerId: String(id),
        });
        await user.save();
      }
    }

    done(null, user);
  }
}
