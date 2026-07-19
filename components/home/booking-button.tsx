"use client"

/**
 * BookingButton (v7.2): LiquidMetalButton wired to the open-booking event.
 * Exists because function props cannot cross the server -> client boundary;
 * the server page renders this island wherever a booking trigger is needed.
 */

import { LiquidMetalButton } from "@/components/ui/liquid-metal-button"
import { Magnetic } from "@/components/ui/magnetic"
import { openBooking } from "@/components/home/actions"

export function BookingButton({
  label,
  className,
  magnetic = false,
}: {
  label: string
  className?: string
  magnetic?: boolean
}) {
  const button = <LiquidMetalButton label={label} onClick={openBooking} className={className} />
  if (magnetic) {
    return <Magnetic className="inline-block">{button}</Magnetic>
  }
  return button
}
