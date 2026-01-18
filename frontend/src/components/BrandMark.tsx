import { cn } from '@/lib/utils';

interface BrandMarkProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: {
    logo: 'h-7 w-auto',
    title: 'text-sm',
    subtitle: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    logo: 'h-8 w-auto',
    title: 'text-base',
    subtitle: 'text-xs',
    gap: 'gap-3',
  },
  lg: {
    logo: 'h-10 w-auto',
    title: 'text-lg',
    subtitle: 'text-sm',
    gap: 'gap-3',
  },
};

export function BrandMark({ variant = 'dark', size = 'md', className }: BrandMarkProps) {
  const styles = sizeStyles[size];
  const titleColor = variant === 'dark' ? 'text-slate-900' : 'text-white';
  const subtitleColor = variant === 'dark' ? 'text-slate-500' : 'text-slate-300';
  const logoSrc = variant === 'dark' ? '/brand-logo-light.svg' : '/brand-logo-blue.svg';

  return (
    <div className={cn('flex items-center', styles.gap, className)}>
      <img
        src={logoSrc}
        alt="Forbiz & GetWork"
        className={cn('object-contain drop-shadow-sm', styles.logo)}
      />
      <div className="leading-tight">
        <div className={cn('font-semibold tracking-wide uppercase', styles.title, titleColor)}>
          Forbiz &amp; GetWork
        </div>
        <div className={cn('font-medium', styles.subtitle, subtitleColor)}>
          Central de Ferramentas
        </div>
      </div>
    </div>
  );
}
