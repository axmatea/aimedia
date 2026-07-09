import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  return (
    <div
      {...props}
      className={cn(
        "overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]",
        className
      )}
    >
      <InfiniteSlider gap={64} reverse speed={10} speedOnHover={4}>
        {logos.map((logo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={logo.alt}
            className="pointer-events-none h-7 select-none brightness-0 dark:invert opacity-60 hover:opacity-90 transition-opacity md:h-9"
            height={logo.height || 24}
            key={`logo-${logo.alt}`}
            loading="lazy"
            src={logo.src}
            /* width omitted when unknown: the HTML width attribute only accepts
               integers ("auto" is invalid markup); CSS h-7/md:h-9 controls size */
            width={logo.width}
          />
        ))}
      </InfiniteSlider>
    </div>
  );
}
