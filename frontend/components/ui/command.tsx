"use client";
import * as React from "react";
import { Command as Primitive } from "cmdk";
import { cn } from "../../lib/utils";
export function Command(props: React.ComponentProps<typeof Primitive>) {
  return (
    <Primitive
      className="flex w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground"
      {...props}
    />
  );
}
export function CommandInput(
  props: React.ComponentProps<typeof Primitive.Input>,
) {
  return (
    <Primitive.Input
      className="h-12 w-full border-b bg-transparent px-3 text-sm placeholder:text-muted-foreground"
      {...props}
    />
  );
}
export function CommandList(
  props: React.ComponentProps<typeof Primitive.List>,
) {
  return <Primitive.List className="max-h-80 overflow-y-auto p-2" {...props} />;
}
export const CommandEmpty = Primitive.Empty;
export function CommandGroup(
  props: React.ComponentProps<typeof Primitive.Group>,
) {
  return (
    <Primitive.Group
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
      {...props}
    />
  );
}
export function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        "flex cursor-default items-center gap-3 rounded-md px-3 py-3 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
