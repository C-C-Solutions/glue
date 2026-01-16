/**
 * JSON transformer for data manipulation
 * Supports JSONPath-like operations and transformations
 */
export class JsonTransformer {
  /**
   * Transform input data using a mapping configuration
   * @param input - Input data to transform
   * @param mapping - Transformation mapping { outputField: 'path.to.input' }
   */
  transform(input: unknown, mapping: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [outputKey, inputPath] of Object.entries(mapping)) {
      const value = this.getValueByPath(input, inputPath);
      this.setValueByPath(result, outputKey, value);
    }
    
    return result;
  }
  
  /**
   * Get value from object by dot-notation path
   */
  private getValueByPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }
    
    const parts = path.split('.');
    let current: any = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Set value in object by dot-notation path
   */
  private setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    const lastPart = parts.pop()!;
    let current: any = obj;
    
    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[lastPart] = value;
  }
  
  /**
   * Filter array elements based on a condition
   */
  filter(input: unknown[], predicate: (item: unknown) => boolean): unknown[] {
    return input.filter(predicate);
  }
  
  /**
   * Map array elements to new values
   */
  map(input: unknown[], mapper: (item: unknown) => unknown): unknown[] {
    return input.map(mapper);
  }
}
