import * as bcrypt from 'bcrypt';
import { Factory } from 'fishery';
import { SECURITY_CONSTANTS } from '../../src/common/constants/app.constants';
import { Admin } from '../../src/modules/admin/admin.entity';

/**
 * Admin Factory - Fishery를 사용한 관리자 테스트 데이터 생성
 */
export const AdminFactory = Factory.define<Admin>(({ sequence }) => {
  const admin = new Admin();

  // 기본 관리자 정보
  admin.name = `테스트관리자${sequence}`;
  admin.email = `admin-${sequence}@example.com`;

  // 패스워드는 동기적으로 해싱 (테스트용)
  admin.password = bcrypt.hashSync(
    'admin123!',
    SECURITY_CONSTANTS.BCRYPT_SALT_ROUNDS,
  );

  // 토큰 (기본값: null)
  admin.refreshToken = null;

  // 타임스탬프
  admin.createdAt = new Date();
  admin.updatedAt = new Date();

  return admin;
});
