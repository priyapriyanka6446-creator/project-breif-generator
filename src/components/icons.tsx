import type { SVGProps } from 'react';

export function Logo(props: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) {
  return (
    <img
      src="/logo.png"
      alt="Project Brief Generator Logo"
      {...props}
    />
  );
}
