import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { EditorShell } from "@/components/layout/EditorShell"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="timeliner-theme">
      <TooltipProvider delayDuration={300}>
        <EditorShell />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
