import { BadRequestException } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';

/**
 * Input Sanitization 유틸리티
 * SQL Injection, XSS, Path Traversal 등 보안 취약점 방지
 */
export class SanitizationUtil {
  /**
   * HTML/Script 태그 제거 (XSS 방지)
   */
  static sanitizeHtml(input: string): string {
    if (!input) return '';

    // DOMPurify를 사용한 안전한 HTML 정제
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // 모든 HTML 태그 제거
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true, // 텍스트 내용은 유지
    });
  }

  /**
   * SQL 특수문자 이스케이프
   * PostgreSQL 전문 검색용
   */
  static escapeSqlSpecialChars(input: string): string {
    if (!input) return '';

    // PostgreSQL 전문 검색 특수문자 이스케이프
    return input
      .replace(/\\/g, '\\\\') // 백슬래시
      .replace(/'/g, "''") // 작은따옴표
      .replace(/"/g, '""') // 큰따옴표
      .replace(/%/g, '\\%') // 퍼센트
      .replace(/_/g, '\\_') // 언더스코어
      .replace(/\$/g, '\\$') // 달러
      .replace(/\(/g, '\\(') // 괄호
      .replace(/\)/g, '\\)')
      .replace(/\[/g, '\\[') // 대괄호
      .replace(/\]/g, '\\]')
      .replace(/\|/g, '\\|') // 파이프
      .replace(/\*/g, '\\*') // 별표
      .replace(/\?/g, '\\?') // 물음표
      .replace(/\+/g, '\\+') // 플러스
      .replace(/\./g, '\\.') // 점
      .replace(/\^/g, '\\^') // 캐럿
      .replace(/\{/g, '\\{') // 중괄호
      .replace(/\}/g, '\\}');
  }

  /**
   * 파일명 검증 및 정제 (Path Traversal 방지)
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName) {
      throw new BadRequestException('파일명이 비어있습니다.');
    }

    // 경로 탐색 패턴 차단
    const pathTraversalPatterns = [
      '../',
      '..\\',
      '..%2F',
      '..%5C',
      '%2E%2E%2F',
      '%2E%2E%5C',
    ];

    for (const pattern of pathTraversalPatterns) {
      if (fileName.includes(pattern)) {
        throw new BadRequestException('잘못된 파일명입니다.');
      }
    }

    // 위험한 문자 제거
    const sanitized = fileName
      .replace(/[<>:"|?*]/g, '') // Windows 파일명 금지 문자
      .replace(/[\x00-\x1F\x7F]/g, '') // 제어 문자
      .replace(/^\.+/, '') // 숨김 파일 방지
      .replace(/\s+/g, '_') // 공백을 언더스코어로
      .substring(0, 255); // 최대 길이 제한

    // 확장자 검증
    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp', // 이미지
      '.mp4',
      '.mov',
      '.avi',
      '.webm', // 비디오
      '.mp3',
      '.wav',
      '.aac', // 오디오
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx', // 문서
      '.txt',
      '.csv',
      '.json',
      '.xml', // 텍스트
      '.zip',
      '.rar',
      '.7z', // 압축
    ];

    const extension = sanitized.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (extension && !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `허용되지 않은 파일 형식입니다: ${extension}`,
      );
    }

    return sanitized;
  }

  /**
   * 이메일 주소 검증 및 정제
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';

    // 기본 이메일 형식 검증
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('올바른 이메일 형식이 아닙니다.');
    }

    // 소문자 변환 및 공백 제거
    return email.toLowerCase().trim();
  }

  /**
   * 전화번호 검증 및 정제
   */
  static sanitizePhoneNumber(phone: string): string {
    if (!phone) return '';

    // 숫자와 하이픈만 허용
    const sanitized = phone.replace(/[^0-9-]/g, '');

    // 한국 전화번호 형식 검증
    const phoneRegex =
      /^(01[0-9]-?[0-9]{3,4}-?[0-9]{4}|0[2-9][0-9]-?[0-9]{3,4}-?[0-9]{4})$/;
    if (!phoneRegex.test(sanitized)) {
      throw new BadRequestException('올바른 전화번호 형식이 아닙니다.');
    }

    return sanitized;
  }

  /**
   * URL 검증 및 정제
   */
  static sanitizeUrl(url: string): string {
    if (!url) return '';

    try {
      const parsed = new URL(url);

      // 허용된 프로토콜만 사용
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        throw new BadRequestException('허용되지 않은 URL 프로토콜입니다.');
      }

      // JavaScript 프로토콜 차단
      if (
        url.toLowerCase().includes('javascript:') ||
        url.toLowerCase().includes('data:') ||
        url.toLowerCase().includes('vbscript:')
      ) {
        throw new BadRequestException('보안상 허용되지 않은 URL입니다.');
      }

      return parsed.toString();
    } catch {
      throw new BadRequestException('올바른 URL 형식이 아닙니다.');
    }
  }

  /**
   * 일반 텍스트 입력 정제
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (!input) return '';

    // HTML 태그 제거
    let sanitized = this.sanitizeHtml(input);

    // 제어 문자 제거 (줄바꿈 제외)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 최대 길이 제한
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized.trim();
  }

  /**
   * 검색어 정제 (SQL Injection 방지)
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query) return '';

    // HTML 태그 제거
    let sanitized = this.sanitizeHtml(query);

    // SQL 특수문자 이스케이프
    sanitized = this.escapeSqlSpecialChars(sanitized);

    // 최대 길이 제한 (검색어는 보통 짧음)
    const maxLength = 100;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized.trim();
  }

  /**
   * JSON 문자열 검증
   */
  static sanitizeJson(jsonString: string): any {
    if (!jsonString) return null;

    try {
      const parsed = JSON.parse(jsonString);

      // 재귀적으로 모든 문자열 값 정제
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return this.sanitizeText(obj);
        } else if (Array.isArray(obj)) {
          return obj.map((item) => sanitizeObject(item));
        } else if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              // 키도 정제
              const sanitizedKey = this.sanitizeText(key, 50);
              sanitized[sanitizedKey] = sanitizeObject(obj[key]);
            }
          }
          return sanitized;
        }
        return obj;
      };

      return sanitizeObject(parsed);
    } catch {
      throw new BadRequestException('올바른 JSON 형식이 아닙니다.');
    }
  }

  /**
   * 숫자 입력 검증
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number {
    const num = Number(input);

    if (isNaN(num)) {
      throw new BadRequestException('올바른 숫자가 아닙니다.');
    }

    if (min !== undefined && num < min) {
      throw new BadRequestException(`값은 ${min} 이상이어야 합니다.`);
    }

    if (max !== undefined && num > max) {
      throw new BadRequestException(`값은 ${max} 이하여야 합니다.`);
    }

    return num;
  }

  /**
   * 배열 입력 검증
   */
  static sanitizeArray<T>(
    input: any[],
    itemSanitizer: (item: any) => T,
    maxLength: number = 100,
  ): T[] {
    if (!Array.isArray(input)) {
      throw new BadRequestException('배열 형식이 아닙니다.');
    }

    if (input.length > maxLength) {
      throw new BadRequestException(
        `배열 크기는 ${maxLength}개를 초과할 수 없습니다.`,
      );
    }

    return input.map((item) => itemSanitizer(item));
  }
}
