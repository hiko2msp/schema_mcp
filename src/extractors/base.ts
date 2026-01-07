import type { ExtractorConfig, ExtractorResult } from '../core/types.js';

export abstract class BaseExtractor {
  protected config: ExtractorConfig;

  constructor(config: ExtractorConfig) {
    this.config = config;
  }

  abstract extract(): Promise<ExtractorResult>;
}
