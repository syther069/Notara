import { Field as FieldPrimitive } from "@base-ui/react/field";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type FieldProps = ComponentProps<typeof FieldPrimitive.Root>;
export type FieldLabelProps = ComponentProps<typeof FieldPrimitive.Label>;
export type FieldDescriptionProps = ComponentProps<
  typeof FieldPrimitive.Description
>;
export type FieldErrorProps = ComponentProps<typeof FieldPrimitive.Error>;
export type FieldControlProps = ComponentProps<typeof FieldPrimitive.Control>;

/**
 * SmoothUI Field — Base UI compound (no Radix twin).
 * Groups label, description, control, and error for accessible forms.
 */
const Field = ({ className, ...props }: FieldProps) => (
  <FieldPrimitive.Root
    className={cn("flex w-full flex-col gap-1.5", className)}
    data-slot="field"
    {...props}
  />
);

const FieldLabel = ({ className, ...props }: FieldLabelProps) => (
  <FieldPrimitive.Label
    className={cn(
      "font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:text-muted",
      className
    )}
    data-slot="field-label"
    {...props}
  />
);

const FieldDescription = ({ className, ...props }: FieldDescriptionProps) => (
  <FieldPrimitive.Description
    className={cn("text-muted text-sm", className)}
    data-slot="field-description"
    {...props}
  />
);

const FieldError = ({ className, ...props }: FieldErrorProps) => (
  <FieldPrimitive.Error
    className={cn("text-danger text-sm", className)}
    data-slot="field-error"
    {...props}
  />
);

const FieldControl = ({ className, ...props }: FieldControlProps) => (
  <FieldPrimitive.Control
    className={cn(
      "transition-colors duration-200 focus-ring flex h-9 w-full rounded-md border border-foreground/25 bg-background px-3 text-sm outline-none placeholder:text-muted/60 focus-visible:border-focus disabled:cursor-not-allowed disabled:border-foreground/20 disabled:bg-default disabled:text-muted disabled:placeholder:text-muted/70 aria-invalid:border-danger aria-invalid:ring-danger/20 dark:aria-invalid:ring-danger/40",
      className
    )}
    data-slot="field-control"
    {...props}
  />
);

export { FieldControl, FieldDescription, FieldError, FieldLabel };

export default Field;
