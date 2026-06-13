import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          // Base layout (color comes from the per-type classes below).
          toast:
            "group toast rounded-xl border group-[.toaster]:shadow-lg font-display text-sm font-semibold",
          description: "group-[.toast]:font-normal group-[.toast]:opacity-90",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Distinct vibes per status.
          success:
            "group-[.toaster]:!bg-emerald-50 group-[.toaster]:!text-emerald-900 group-[.toaster]:!border-emerald-300 dark:group-[.toaster]:!bg-emerald-950 dark:group-[.toaster]:!text-emerald-100",
          error:
            "group-[.toaster]:!bg-red-50 group-[.toaster]:!text-red-900 group-[.toaster]:!border-red-300 dark:group-[.toaster]:!bg-red-950 dark:group-[.toaster]:!text-red-100",
          warning:
            "group-[.toaster]:!bg-amber-50 group-[.toaster]:!text-amber-900 group-[.toaster]:!border-amber-300 dark:group-[.toaster]:!bg-amber-950 dark:group-[.toaster]:!text-amber-100",
          info:
            "group-[.toaster]:!bg-blue-50 group-[.toaster]:!text-blue-900 group-[.toaster]:!border-blue-300 dark:group-[.toaster]:!bg-blue-950 dark:group-[.toaster]:!text-blue-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
