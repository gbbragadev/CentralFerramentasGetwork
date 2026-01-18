import { cn } from '@/lib/utils';

interface BrandMarkProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: {
    logo: 'h-7 w-7',
    title: 'text-sm',
    subtitle: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    logo: 'h-8 w-8',
    title: 'text-base',
    subtitle: 'text-xs',
    gap: 'gap-3',
  },
  lg: {
    logo: 'h-10 w-10',
    title: 'text-lg',
    subtitle: 'text-sm',
    gap: 'gap-3',
  },
};

export function BrandMark({ variant = 'dark', size = 'md', className }: BrandMarkProps) {
  const styles = sizeStyles[size];
  const titleColor = variant === 'dark' ? 'text-slate-900' : 'text-white';
  const subtitleColor = variant === 'dark' ? 'text-slate-500' : 'text-slate-300';

  return (
    <div className={cn('flex items-center', styles.gap, className)}>
      <div className="flex items-center gap-2">
        <img
          src="/forbiz-logo.jpg"
          alt="Forbiz"
          className={cn('rounded-md object-cover shadow-sm', styles.logo)}
        />
        <img
          src="/getwork-logo.jpg"
          alt="GetWork"
          className={cn('rounded-md object-cover shadow-sm', styles.logo)}
        />
      </div>
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
