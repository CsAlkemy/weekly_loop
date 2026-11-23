import * as React from "react";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";

import { cn } from "../lib/cn";
import { CommonButton, type CommonButtonProps } from "./common-button";

type FormSchema = z.ZodType<FieldValues, FieldValues>;

export type CommonFormApi<TSchema extends FormSchema> = UseFormReturn<
  z.input<TSchema>,
  unknown,
  z.output<TSchema>
>;

export interface CommonFormProps<TSchema extends FormSchema> extends Omit<
  React.ComponentProps<"form">,
  "onSubmit" | "children"
> {
  schema: TSchema;
  defaultValues: DefaultValues<z.input<TSchema>>;
  onSubmit: (values: z.output<TSchema>, form: CommonFormApi<TSchema>) => void | Promise<void>;
  children: React.ReactNode | ((form: CommonFormApi<TSchema>) => React.ReactNode);
}

export function CommonForm<TSchema extends FormSchema>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  ...props
}: CommonFormProps<TSchema>) {
  const form = useForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    resolver: standardSchemaResolver(schema),
    defaultValues,
  });

  return (
    <FormProvider {...form}>
      <form
        noValidate
        {...props}
        className={cn("grid gap-4", className)}
        onSubmit={(event) => {
          event.stopPropagation();
          void form.handleSubmit((values) => onSubmit(values, form))(event);
        }}
      >
        {typeof children === "function" ? children(form) : children}
      </form>
    </FormProvider>
  );
}

export function CommonFormSubmit({ loading, children, ...props }: CommonButtonProps) {
  const { formState } = useFormContext();

  return (
    <CommonButton type="submit" loading={loading || formState.isSubmitting} {...props}>
      {children}
    </CommonButton>
  );
}
