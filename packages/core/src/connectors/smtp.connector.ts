import { z } from "zod";
import nodemailer, { Transporter } from "nodemailer";
import {
  BaseConnector,
  ConnectorResult,
  ValidationResult,
} from "./base.connector";

/**
 * SMTP connector configuration schema
 */
const smtpConfigSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.number().default(587),
  secure: z.boolean().optional().default(false),
  auth: z
    .object({
      user: z.string().min(1, "Auth user is required"),
      pass: z.string().min(1, "Auth password is required"),
    })
    .optional(),
  from: z.string().email().optional(),
});

export type SMTPConfig = z.infer<typeof smtpConfigSchema>;

/**
 * SMTP connector input schema
 */
const smtpInputSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().min(1, "Subject is required"),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string().optional(),
        path: z.string().optional(),
        contentType: z.string().optional(),
      }),
    )
    .optional(),
});

export type SMTPInput = z.infer<typeof smtpInputSchema>;

/**
 * SMTP/Email connector implementation
 * Sends emails via SMTP servers
 */
export class SMTPConnector extends BaseConnector {
  readonly type = "smtp";
  private transporters: Map<string, Transporter> = new Map();

  /**
   * Execute email send
   */
  async execute(config: unknown, input: unknown): Promise<ConnectorResult> {
    // Validate config
    const configResult = smtpConfigSchema.safeParse(config);
    if (!configResult.success) {
      return {
        success: false,
        error: {
          message: "Invalid configuration",
          code: "INVALID_CONFIG",
          details: configResult.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          ),
        },
      };
    }

    // Validate input
    const inputResult = smtpInputSchema.safeParse(input);
    if (!inputResult.success) {
      return {
        success: false,
        error: {
          message: "Invalid input",
          code: "INVALID_INPUT",
          details: inputResult.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`,
          ),
        },
      };
    }

    const smtpConfig = configResult.data;
    const smtpInput = inputResult.data;

    // Validate that either text or html is provided
    if (!smtpInput.text && !smtpInput.html) {
      return {
        success: false,
        error: {
          message: "Either text or html content is required",
          code: "INVALID_INPUT",
        },
      };
    }

    try {
      // Get or create transporter
      const transporter = this.getTransporter(smtpConfig);

      // Send email
      const info = await transporter.sendMail({
        from: smtpConfig.from,
        to: smtpInput.to,
        cc: smtpInput.cc,
        bcc: smtpInput.bcc,
        subject: smtpInput.subject,
        text: smtpInput.text,
        html: smtpInput.html,
        attachments: smtpInput.attachments,
      });

      return {
        success: true,
        data: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: {
          message: errorMessage,
          code: "EXECUTION_ERROR",
          details: error,
        },
      };
    }
  }

  /**
   * Validate SMTP connector configuration
   */
  validate(config: unknown): ValidationResult {
    return this.validateWithZod(smtpConfigSchema, config);
  }

  /**
   * Get or create transporter
   */
  private getTransporter(config: SMTPConfig): Transporter {
    const key = `${config.host}:${config.port}:${config.auth?.user || ""}`;

    if (!this.transporters.has(key)) {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
      });

      this.transporters.set(key, transporter);
    }

    return this.transporters.get(key)!;
  }
}
