import { Factory } from 'fishery';
import { ReadReceipt } from '../../src/modules/read-receipt/read-receipt.entity';

/**
 * ReadReceipt Factory - Fishery를 사용한 메시지 읽음 확인 테스트 데이터 생성
 */
export const ReadReceiptFactory = Factory.define<ReadReceipt>(({ sequence, params }) => {
  const readReceipt = new ReadReceipt();

  // 기본 정보
  readReceipt.id = sequence;
  readReceipt.messageId = params.messageId || sequence;
  readReceipt.userId = params.userId || sequence;
  readReceipt.planetId = params.planetId || sequence;

  // 읽음 정보
  readReceipt.readAt = new Date();

  // 타임스탬프
  readReceipt.createdAt = new Date();
  readReceipt.updatedAt = new Date();

  return readReceipt;
});

/**
 * 최근 읽음 확인 Factory
 */
export const RecentReadReceiptFactory = ReadReceiptFactory.params({
  readAt: new Date(),
});

/**
 * 과거 읽음 확인 Factory
 */
export const OldReadReceiptFactory = ReadReceiptFactory.params({
  readAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7일 전
});

/**
 * 배치 읽음 확인 Factory (여러 메시지를 한번에 읽음)
 */
export const BatchReadReceiptFactory = Factory.define<ReadReceipt[]>(({ sequence, params }) => {
  const receipts: ReadReceipt[] = [];
  const count = params.count || 5;
  const baseMessageId = params.baseMessageId || sequence;
  const userId = params.userId || sequence;
  const planetId = params.planetId || sequence;
  const readAt = new Date();

  for (let i = 0; i < count; i++) {
    const receipt = new ReadReceipt();
    receipt.id = sequence + i;
    receipt.messageId = baseMessageId + i;
    receipt.userId = userId;
    receipt.planetId = planetId;
    receipt.readAt = readAt;
    receipt.createdAt = new Date();
    receipt.updatedAt = new Date();
    receipts.push(receipt);
  }

  return receipts;
});