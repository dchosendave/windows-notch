import { PRODUCT } from "@/shared/config/product";

export const HAMIN_ERROR_EVENT = `${PRODUCT.eventPrefix}:operational-error`;

export type AppError = {
  code: string;
  feature: string;
  message: string;
  severity: "warning" | "error" | "fatal";
  recoverable: boolean;
  cause?: unknown;
};

export function reportOperationalError(message: string, cause: unknown, feature = "system") {
  const error: AppError = { code: "OPERATION_FAILED", feature, message, severity: "error", recoverable: true, cause };
  console.error(`[${feature}] ${message}`, cause);
  window.dispatchEvent(new CustomEvent<AppError>(HAMIN_ERROR_EVENT, { detail: error }));
}
