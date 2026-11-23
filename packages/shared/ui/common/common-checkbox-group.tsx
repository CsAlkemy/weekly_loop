import * as React from "react";
import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { cn } from "../lib/cn";
import { Checkbox } from "../schadcn/checkbox";

export interface CommonCheckboxOption {
  label: string;
  value: string;
  hint?: string;
}

export interface CommonCheckboxGroupProps<TFieldValues extends FieldValues> {
  control?: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  hint?: string;
  options: CommonCheckboxOption[];
  className?: string;
}

export function CommonCheckboxGroup<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  options,
  className,
}: CommonCheckboxGroupProps<TFieldValues>) {
  const { field, fieldState } = useController({ control, name });
  const groupId = React.useId();
  const selected: string[] = Array.isArray(field.value) ? field.value : [];

  const toggle = (value: string, checked: boolean) =>
    field.onChange(
      checked ? [...selected, value] : selected.filter((current) => current !== value),
    );

  return (
    <fieldset
      aria-describedby={hint ? `${groupId}-hint` : undefined}
      className={cn("grid gap-2", className)}
    >
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      {hint ? (
        <p id={`${groupId}-hint`} className="-mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${groupId}-${option.value}`;
          const checked = selected.includes(option.value);

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors",
                checked
                  ? "border-primary/40 bg-accent"
                  : "border-input bg-card hover:border-primary/40",
              )}
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => toggle(option.value, value === true)}
              />
              <span className="font-medium">{option.label}</span>
            </label>
          );
        })}
      </div>
      {fieldState.error?.message ? (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      ) : null}
    </fieldset>
  );
}
