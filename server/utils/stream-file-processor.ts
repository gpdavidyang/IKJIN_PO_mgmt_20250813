import { Readable, Writable, Transform, pipeline } from 'stream';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createWriteStream, createReadStream } from 'fs';
import { EventEmitter } from 'events';

const pipelineAsync = promisify(pipeline);

// 파일 처리 진행 상황 추적을 위한 이벤트 이미터
export class FileProcessingEventEmitter extends EventEmitter {
  emitProgress(progress: number, message?: string) {
    this.emit('progress', { progress, message });
  }

  emitError(error: Error) {
    this.emit('error', error);
  }

  emitComplete(result: any) {
    this.emit('complete', result);
  }

  emitChunk(chunkInfo: any) {
    this.emit('chunk', chunkInfo);
  }
}

// 파일 처리 설정
export interface StreamProcessingConfig {
  chunkSize: number; // 청크 크기 (바이트)
  maxFileSize: number; // 최대 파일 크기
  tempDir: string; // 임시 디렉토리
  cleanup: boolean; // 처리 후 임시 파일 정리 여부
  compression: boolean; // 압축 사용 여부
  memoryLimit: number; // 메모리 사용 제한 (바이트)
}

const DEFAULT_CONFIG: StreamProcessingConfig = {
  chunkSize: 64 * 1024, // 64KB
  maxFileSize: 100 * 1024 * 1024, // 100MB
  tempDir: '/tmp',
  cleanup: true,
  compression: false,
  memoryLimit: 50 * 1024 * 1024, // 50MB
};

/**
 * 메모리 최적화된 스트림 기반 Excel 처리기
 */
export class StreamExcelProcessor {
  private config: StreamProcessingConfig;
  private eventEmitter: FileProcessingEventEmitter;

  constructor(config: Partial<StreamProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventEmitter = new FileProcessingEventEmitter();
  }

  /**
   * 이벤트 리스너 등록
   */
  on(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
    return this;
  }

  /**
   * 스트림 기반 Excel 파일 파싱
   */
  async parseExcelStream(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        this.eventEmitter.emitProgress(0, 'Excel 파일 읽기 시작');

        // 파일 크기 확인
        const fileStats = fs.statSync(filePath);
        if (fileStats.size > this.config.maxFileSize) {
          throw new Error(`파일 크기가 너무 큽니다: ${fileStats.size} bytes`);
        }

        const results: any[] = [];
        let processedBytes = 0;

        // 스트림 기반 파일 읽기
        const fileStream = createReadStream(filePath, {
          highWaterMark: this.config.chunkSize
        });

        const chunks: Buffer[] = [];

        fileStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          processedBytes += chunk.length;
          
          const progress = (processedBytes / fileStats.size) * 50; // 읽기는 50%까지
          this.eventEmitter.emitProgress(progress, `파일 읽기 중: ${processedBytes}/${fileStats.size} bytes`);
        });

        fileStream.on('end', () => {
          try {
            this.eventEmitter.emitProgress(50, 'Excel 파일 파싱 시작');

            // 모든 청크를 하나의 버퍼로 합치기
            const fullBuffer = Buffer.concat(chunks);
            
            // Excel 워크북 파싱
            const workbook = XLSX.read(fullBuffer, { 
              type: 'buffer',
              cellDates: true,
              cellNF: false,
              cellText: false
            });

            this.eventEmitter.emitProgress(75, '워크시트 처리 중');

            // 각 워크시트 처리
            workbook.SheetNames.forEach((sheetName, index) => {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                raw: false,
                dateNF: 'yyyy-mm-dd'
              });

              results.push({
                sheetName,
                data: jsonData
              });

              const sheetProgress = 75 + (index + 1) / workbook.SheetNames.length * 25;
              this.eventEmitter.emitProgress(sheetProgress, `시트 처리 완료: ${sheetName}`);
            });

            // 메모리 정리
            chunks.length = 0;
            
            this.eventEmitter.emitProgress(100, '파싱 완료');
            this.eventEmitter.emitComplete(results);
            resolve(results);

          } catch (parseError) {
            this.eventEmitter.emitError(parseError as Error);
            reject(parseError);
          }
        });

        fileStream.on('error', (error) => {
          this.eventEmitter.emitError(error);
          reject(error);
        });

      } catch (error) {
        this.eventEmitter.emitError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * 스트림 기반 Excel 파일 생성
   */
  async createExcelStream(data: any[], outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.eventEmitter.emitProgress(0, 'Excel 파일 생성 시작');

        // 새 워크북 생성
        const workbook = XLSX.utils.book_new();

        data.forEach((sheetData, index) => {
          const worksheet = XLSX.utils.aoa_to_sheet(sheetData.data);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetData.sheetName || `Sheet${index + 1}`);
          
          const progress = (index + 1) / data.length * 80;
          this.eventEmitter.emitProgress(progress, `시트 생성 중: ${sheetData.sheetName}`);
        });

        this.eventEmitter.emitProgress(80, '파일 쓰기 시작');

        // 스트림으로 파일 쓰기
        const buffer = XLSX.write(workbook, { 
          type: 'buffer', 
          bookType: 'xlsx',
          compression: this.config.compression
        });

        const writeStream = createWriteStream(outputPath);
        
        writeStream.write(buffer);
        writeStream.end();

        writeStream.on('finish', () => {
          this.eventEmitter.emitProgress(100, '파일 생성 완료');
          this.eventEmitter.emitComplete({ outputPath, size: buffer.length });
          resolve(outputPath);
        });

        writeStream.on('error', (error) => {
          this.eventEmitter.emitError(error);
          reject(error);
        });

      } catch (error) {
        this.eventEmitter.emitError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * 대용량 CSV 파일을 스트림으로 처리
   */
  async processCsvStream(filePath: string, outputPath: string, transformer?: (row: any) => any): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        this.eventEmitter.emitProgress(0, 'CSV 스트림 처리 시작');

        const fileStats = fs.statSync(filePath);
        let processedBytes = 0;
        let rowCount = 0;

        // CSV 파싱 트랜스폼 스트림
        const csvTransform = new Transform({
          objectMode: true,
          transform(chunk: Buffer, encoding, callback) {
            try {
              const lines = chunk.toString().split('\n');
              const results: any[] = [];

              lines.forEach(line => {
                if (line.trim()) {
                  const row = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
                  const transformedRow = transformer ? transformer(row) : row;
                  results.push(transformedRow);
                  rowCount++;
                }
              });

              processedBytes += chunk.length;
              const progress = (processedBytes / fileStats.size) * 100;
              this.eventEmitter.emitProgress(progress, `처리된 행: ${rowCount}`);

              callback(null, results);
            } catch (error) {
              callback(error);
            }
          }
        });

        // Excel 변환 트랜스폼 스트림
        const excelTransform = new Transform({
          objectMode: true,
          transform(chunk: any[], encoding, callback) {
            // 청크를 Excel 형식으로 변환
            const worksheet = XLSX.utils.aoa_to_sheet(chunk);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
            
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            callback(null, buffer);
          }
        });

        // 파이프라인 구성
        await pipelineAsync(
          createReadStream(filePath, { highWaterMark: this.config.chunkSize }),
          csvTransform,
          excelTransform,
          createWriteStream(outputPath)
        );

        this.eventEmitter.emitProgress(100, `CSV 변환 완료: ${rowCount}개 행 처리`);
        this.eventEmitter.emitComplete({ outputPath, rowCount });
        resolve(outputPath);

      } catch (error) {
        this.eventEmitter.emitError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * 메모리 사용량 모니터링
   */
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * 파일 청크 처리
   */
  async processFileInChunks(
    filePath: string, 
    processor: (chunk: Buffer, index: number) => Promise<any>
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const fileStream = createReadStream(filePath, {
        highWaterMark: this.config.chunkSize
      });

      let chunkIndex = 0;
      const fileStats = fs.statSync(filePath);
      let processedBytes = 0;

      fileStream.on('data', async (chunk: Buffer) => {
        try {
          fileStream.pause(); // 처리 중 스트림 일시 정지

          const result = await processor(chunk, chunkIndex);
          results.push(result);

          processedBytes += chunk.length;
          const progress = (processedBytes / fileStats.size) * 100;
          
          this.eventEmitter.emitProgress(progress, `청크 ${chunkIndex + 1} 처리 완료`);
          this.eventEmitter.emitChunk({
            index: chunkIndex,
            size: chunk.length,
            totalProcessed: processedBytes,
            result
          });

          chunkIndex++;
          fileStream.resume(); // 스트림 재개
        } catch (error) {
          this.eventEmitter.emitError(error as Error);
          reject(error);
        }
      });

      fileStream.on('end', () => {
        this.eventEmitter.emitProgress(100, `모든 청크 처리 완료: ${chunkIndex}개`);
        this.eventEmitter.emitComplete(results);
        resolve(results);
      });

      fileStream.on('error', (error) => {
        this.eventEmitter.emitError(error);
        reject(error);
      });
    });
  }

  /**
   * 임시 파일 정리
   */
  async cleanup(tempFiles: string[]): Promise<void> {
    if (!this.config.cleanup) return;

    for (const filePath of tempFiles) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (error) {
        console.warn(`임시 파일 삭제 실패: ${filePath}`, error);
      }
    }
  }
}

/**
 * 메모리 효율적인 파일 복사 스트림
 */
export class MemoryEfficientFileCopy {
  private config: StreamProcessingConfig;

  constructor(config: Partial<StreamProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 스트림 기반 파일 복사
   */
  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sourceStream = createReadStream(sourcePath, {
        highWaterMark: this.config.chunkSize
      });
      
      const destinationStream = createWriteStream(destinationPath);

      sourceStream.pipe(destinationStream);

      destinationStream.on('finish', resolve);
      destinationStream.on('error', reject);
      sourceStream.on('error', reject);
    });
  }

  /**
   * 압축을 사용한 파일 복사
   */
  async copyFileWithCompression(sourcePath: string, destinationPath: string): Promise<void> {
    const zlib = await import('zlib');
    
    return new Promise((resolve, reject) => {
      const sourceStream = createReadStream(sourcePath);
      const compressionStream = zlib.createGzip();
      const destinationStream = createWriteStream(destinationPath);

      sourceStream.pipe(compressionStream).pipe(destinationStream);

      destinationStream.on('finish', resolve);
      destinationStream.on('error', reject);
      sourceStream.on('error', reject);
      compressionStream.on('error', reject);
    });
  }
}

/**
 * 파일 처리 통계
 */
export interface FileProcessingStats {
  totalFiles: number;
  totalSize: number;
  processedFiles: number;
  processedSize: number;
  averageProcessingTime: number;
  errorCount: number;
  memoryPeak: number;
}

/**
 * 파일 처리 통계 수집기
 */
export class FileProcessingStatsCollector {
  private stats: FileProcessingStats = {
    totalFiles: 0,
    totalSize: 0,
    processedFiles: 0,
    processedSize: 0,
    averageProcessingTime: 0,
    errorCount: 0,
    memoryPeak: 0
  };

  private processingTimes: number[] = [];

  recordProcessingStart(fileSize: number): number {
    this.stats.totalFiles++;
    this.stats.totalSize += fileSize;
    return Date.now();
  }

  recordProcessingEnd(startTime: number, fileSize: number, success: boolean): void {
    const processingTime = Date.now() - startTime;
    
    if (success) {
      this.stats.processedFiles++;
      this.stats.processedSize += fileSize;
      this.processingTimes.push(processingTime);
      
      // 평균 처리 시간 계산
      this.stats.averageProcessingTime = 
        this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    } else {
      this.stats.errorCount++;
    }

    // 메모리 사용량 기록
    const memoryUsage = process.memoryUsage();
    this.stats.memoryPeak = Math.max(this.stats.memoryPeak, memoryUsage.heapUsed);
  }

  getStats(): FileProcessingStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalFiles: 0,
      totalSize: 0,
      processedFiles: 0,
      processedSize: 0,
      averageProcessingTime: 0,
      errorCount: 0,
      memoryPeak: 0
    };
    this.processingTimes = [];
  }
}

// 글로벌 인스턴스들
export const streamExcelProcessor = new StreamExcelProcessor();
export const memoryEfficientFileCopy = new MemoryEfficientFileCopy();
export const fileStatsCollector = new FileProcessingStatsCollector();

export default StreamExcelProcessor;