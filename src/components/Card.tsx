import type { FormHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const CARD_CLASSES = "rounded-lg border border-line bg-card p-6 shadow-md xl:p-8";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  as?: "div";
  hover?: boolean;
};

export type CardFormProps = FormHTMLAttributes<HTMLFormElement> & {
  as: "form";
  hover?: boolean;
};

export function Card({ as = "div", hover = false, className, children, ...rest }: CardProps | CardFormProps) {
  const classes = cn(CARD_CLASSES, hover && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg", className);

  if (as === "form") {
    return (
      <form className={classes} {...(rest as FormHTMLAttributes<HTMLFormElement>)}>
        {children}
      </form>
    );
  }

  return (
    <div className={classes} {...(rest as HTMLAttributes<HTMLDivElement>)}>
      {children}
    </div>
  );
}
