"use client";

import type { ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppSelectOption {
  value: string;
  label: string;
  /** A second, quieter line (e.g. "15 perc · HU") */
  description?: string;
  /** Shown before the label, in the list and in the closed field */
  icon?: ReactNode;
}

export interface AppSelectGroup {
  label: string;
  options: AppSelectOption[];
}

interface AppSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Either a flat list or labelled groups */
  options?: AppSelectOption[];
  groups?: AppSelectGroup[];
  placeholder?: string;
  /** Accessible name when there is no <label htmlFor={id}> */
  ariaLabel?: string;
  "aria-describedby"?: string;
  size?: "md" | "sm";
  className?: string;
  tour?: string;
}

/**
 * The app's dropdown, used everywhere instead of the browser's default
 * select: the same big, rounded field as the text inputs, a calm list with
 * room for an icon and a second line, the chosen item marked with a tick.
 * Radix handles the keyboard (arrows, typing a letter, Esc) and screen readers.
 */
const AppSelect = ({
  id,
  value,
  onValueChange,
  options,
  groups,
  placeholder,
  ariaLabel,
  size = "md",
  className,
  tour,
  ...rest
}: AppSelectProps) => {
  const all = groups ? groups.flatMap((group) => group.options) : (options ?? []);
  const selected = all.find((option) => option.value === value);

  const item = (option: AppSelectOption) => (
    <SelectPrimitive.Item key={option.value} value={option.value} className="app-select-item" textValue={option.label}>
      {option.icon && <span className="app-select-icon">{option.icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col">
        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
        {option.description && <span className="app-select-description">{option.description}</span>}
      </span>
      <SelectPrimitive.ItemIndicator className="app-select-check">
        <Check className="size-5" strokeWidth={3} aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={rest["aria-describedby"]}
        className={cn("app-select-trigger", size === "sm" && "is-small", className)}
        data-tour={tour}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {selected?.icon && (
            <span className="app-select-icon" aria-hidden>
              {selected.icon}
            </span>
          )}
          <span className={cn("truncate", !selected && "text-muted-foreground")} aria-hidden>
            {/* Our own text, so the closed field never shows the second line */}
            {selected ? selected.label : placeholder}
          </span>
          <span className="sr-only">
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
        </span>
        <SelectPrimitive.Icon className="app-select-chevron">
          <ChevronDown className="size-5" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={8} className="app-select-content">
          <SelectPrimitive.ScrollUpButton className="app-select-scroll">
            <ChevronUp className="size-5" aria-hidden />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="app-select-viewport">
            {groups
              ? groups
                  .filter((group) => group.options.length > 0)
                  .map((group) => (
                    <SelectPrimitive.Group key={group.label} className="app-select-group">
                      <SelectPrimitive.Label className="app-select-group-label">{group.label}</SelectPrimitive.Label>
                      {group.options.map(item)}
                    </SelectPrimitive.Group>
                  ))
              : all.map(item)}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="app-select-scroll">
            <ChevronDown className="size-5" aria-hidden />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};

export default AppSelect;
