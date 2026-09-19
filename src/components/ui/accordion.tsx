import * as React from "react"
import { cn } from "@/lib/utils"

function Accordion({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />
}

function AccordionItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b", className)} {...props} />
}

function AccordionTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline w-full text-left",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function AccordionContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-hidden text-sm transition-all pb-4", className)} {...props} />
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
