"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Popover({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>
}

function PopoverTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>
}

function PopoverContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none top-full mt-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
