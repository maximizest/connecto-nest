import { Factory } from 'fishery';
import { Profile } from '../../src/modules/profile/profile.entity';
import { Gender } from '../../src/modules/profile/enums/gender.enum';

/**
 * Profile Factory - Fishery를 사용한 사용자 프로필 테스트 데이터 생성
 */
export const ProfileFactory = Factory.define<Profile>(({ sequence, params }) => {
  const profile = new Profile();

  // 기본 정보
  profile.id = sequence;
  profile.userId = params.userId || sequence;

  // 프로필 정보
  profile.bio = `안녕하세요! 테스트 사용자 ${sequence}입니다.`;
  profile.birthDate = '1990-01-01';
  profile.gender = Gender.PREFER_NOT_TO_SAY;
  profile.phoneNumber = `010-1234-${String(sequence).padStart(4, '0')}`;
  profile.countryCode = 'KR';
  profile.nationality = 'Korean';
  
  // 프로필 이미지
  profile.profileImageUrl = `https://cdn.example.com/profiles/${sequence}/avatar.jpg`;
  profile.backgroundImageUrl = null;

  // 추가 정보
  profile.interests = ['여행', '음식', '문화'];
  profile.languages = ['한국어', '영어'];
  profile.socialLinks = {
    instagram: `@test_user_${sequence}`,
    twitter: null,
    facebook: null,
  };

  // 설정
  profile.isPublic = true;
  profile.showAge = false;
  profile.showLocation = true;

  // 타임스탬프
  profile.createdAt = new Date();
  profile.updatedAt = new Date();

  return profile;
});

/**
 * 남성 프로필 Factory
 */
export const MaleProfileFactory = ProfileFactory.params({
  gender: Gender.MALE,
  birthDate: '1995-05-15',
});

/**
 * 여성 프로필 Factory
 */
export const FemaleProfileFactory = ProfileFactory.params({
  gender: Gender.FEMALE,
  birthDate: '1992-08-20',
});

/**
 * 비공개 프로필 Factory
 */
export const PrivateProfileFactory = ProfileFactory.params({
  isPublic: false,
  showAge: false,
  showLocation: false,
});

/**
 * 완전한 프로필 Factory
 */
export const CompleteProfileFactory = ProfileFactory.params({
  backgroundImageUrl: 'https://cdn.example.com/profiles/background.jpg',
  socialLinks: {
    instagram: '@complete_user',
    twitter: '@complete_user',
    facebook: 'complete.user',
    youtube: 'CompleteUserChannel',
  },
  interests: ['여행', '사진', '음악', '영화', '독서'],
  languages: ['한국어', '영어', '일본어', '중국어'],
});