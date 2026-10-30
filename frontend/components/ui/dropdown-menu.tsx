"use client";
import * as React from "react";
import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "../../lib/utils";
export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-[60] min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        "relative flex min-h-10 cursor-default items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuLabel(
  props: React.ComponentProps<typeof Primitive.Label>,
) {
  return (
    <Primitive.Label
      className="px-3 py-2 text-xs font-semibold text-muted-foreground"
      {...props}
    />
  );
}
export function DropdownMenuSeparator(
  props: React.ComponentProps<typeof Primitive.Separator>,
) {
  return <Primitive.Separator className="my-1 h-px bg-border" {...props} />;
}
