import { StepDefinition, StepExecution, StepConfig } from '../types';
import { 
  BaseConnector, 
  HttpConnector,
  PostgresConnector,
  OpenAIConnector,
  SMTPConnector,
  S3Connector,
  JavaScriptConnector,
  GraphQLConnector
} from '../connectors';
import { JsonTransformer } from '../transformers';
import { ParameterResolver, ParameterContext } from './parameter-resolver';

/**
 * Step runner - executes individual steps
 */
export class StepRunner {
  private connectors: Map<string, BaseConnector>;
  private transformer: JsonTransformer;
  private parameterResolver: ParameterResolver;
  
  constructor() {
    this.connectors = new Map();
    this.transformer = new JsonTransformer();
    this.parameterResolver = new ParameterResolver();
    
    // Register all built-in connectors
    this.registerConnector(new HttpConnector());
    this.registerConnector(new PostgresConnector());
    this.registerConnector(new OpenAIConnector());
    this.registerConnector(new SMTPConnector());
    this.registerConnector(new S3Connector());
    this.registerConnector(new JavaScriptConnector());
    this.registerConnector(new GraphQLConnector());
  }
  
  /**
   * Register a connector
   */
  registerConnector(connector: BaseConnector): void {
    this.connectors.set(connector.type, connector);
  }
  
  /**
   * Execute a single step
   */
  async executeStep(
    step: StepDefinition,
    input: Record<string, unknown>,
    context: Record<string, unknown>,
    parameterContext?: ParameterContext
  ): Promise<StepExecution> {
    const execution: StepExecution = {
      stepId: step.id,
      status: 'running',
      input,
      startedAt: new Date(),
      attempts: 1,
    };
    
    try {
      // Resolve config with parameter context
      let resolvedConfig = step.config;
      if (parameterContext) {
        resolvedConfig = this.parameterResolver.resolve(step.config as Record<string, unknown>, parameterContext) as typeof step.config;
      }
      
      // Resolve parameters if provided
      let resolvedInput = input;
      if (step.parameters && parameterContext) {
        const resolvedParameters = this.parameterResolver.resolve(step.parameters, parameterContext);
        // Merge resolved parameters with input (parameters take precedence)
        resolvedInput = { ...input, ...resolvedParameters };
      }
      
      let output: Record<string, unknown>;
      
      switch (step.type) {
        case 'connector':
          output = await this.executeConnector(resolvedConfig, resolvedInput);
          break;
          
        case 'transformer':
          output = await this.executeTransformer(resolvedConfig, resolvedInput);
          break;
          
        case 'condition':
          output = await this.executeCondition(resolvedConfig, resolvedInput, context);
          break;
          
        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }
      
      execution.status = 'completed';
      execution.output = output;
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = 'failed';
      execution.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      };
      execution.completedAt = new Date();
    }
    
    return execution;
  }
  
  /**
   * Execute connector step
   */
  private async executeConnector(
    config: StepConfig,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const connectorType = (config as any).connectorType || 'http';
    const connector = this.connectors.get(connectorType);
    
    if (!connector) {
      throw new Error(`Connector not found: ${connectorType}`);
    }
    
    const result = await connector.execute(config, input);
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Connector execution failed');
    }
    
    return { data: result.data };
  }
  
  /**
   * Execute transformer step
   */
  private async executeTransformer(
    config: StepConfig,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const mapping = (config as any).mapping || {};
    return this.transformer.transform(input, mapping);
  }
  
  /**
   * Execute condition step
   */
  private async executeCondition(
    config: StepConfig,
    input: Record<string, unknown>,
    _context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Simple condition evaluation (can be extended)
    const condition = (config as any).condition;
    const result = this.evaluateCondition(condition, input);
    return { conditionMet: result };
  }
  
  /**
   * Evaluate a simple condition
   */
  private evaluateCondition(
    condition: any,
    input: Record<string, unknown>
  ): boolean {
    // Basic implementation - can be extended with more complex logic
    if (!condition) return true;
    
    const { field, operator, value } = condition;
    const fieldValue = (input as any)[field];
    
    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'lt':
        return fieldValue < value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      default:
        return true;
    }
  }
  
  /**
   * Execute step with retry policy
   */
  async executeWithRetry(
    step: StepDefinition,
    input: Record<string, unknown>,
    context: Record<string, unknown>,
    parameterContext?: ParameterContext
  ): Promise<StepExecution> {
    const maxAttempts = step.retryPolicy?.maxAttempts || 1;
    const delayMs = step.retryPolicy?.delayMs || 1000;
    const backoffMultiplier = step.retryPolicy?.backoffMultiplier || 1;
    
    let lastExecution: StepExecution | null = null;
    let currentDelay = delayMs;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      lastExecution = await this.executeStep(step, input, context, parameterContext);
      lastExecution.attempts = attempt;
      
      if (lastExecution.status === 'completed') {
        return lastExecution;
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < maxAttempts) {
        await this.sleep(currentDelay);
        currentDelay *= backoffMultiplier;
      }
    }
    
    return lastExecution!;
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
