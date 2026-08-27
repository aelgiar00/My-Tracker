import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster"
      toastOptions={{
        classNames: {
          toast:
            "bg-surface text-fg shadow-[var(--shadow-elevated)] border-0 font-sans",
          description: "text-muted",
          actionButton: "bg-fg text-bg",
          cancelButton: "bg-surface-2 text-fg",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
