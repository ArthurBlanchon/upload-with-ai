import { Toaster } from "sonner"

import { WidgetApp } from "@/components/widget-app"

export { GRIST_OPTIONS, WIDGET_METADATA } from "@/grist-options"

export default function App() {
  return (
    <div className="h-svh w-full overflow-hidden">
      <WidgetApp />
      <Toaster />
    </div>
  )
}
