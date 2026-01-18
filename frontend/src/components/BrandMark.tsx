import { cn } from '@/lib/utils';

interface BrandMarkProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const sizeStyles = {
  sm: {
    logo: 'h-8 w-auto',
    title: 'text-sm',
    subtitle: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    logo: 'h-10 w-auto',
    title: 'text-base',
    subtitle: 'text-xs',
    gap: 'gap-3',
  },
  lg: {
    logo: 'h-14 w-auto',
    title: 'text-lg',
    subtitle: 'text-sm',
    gap: 'gap-3',
  },
};

export function BrandMark({ variant = 'dark', size = 'md', className, showText = false }: BrandMarkProps) {
  const styles = sizeStyles[size];
  const titleColor = variant === 'dark' ? 'text-slate-900' : 'text-white';
  const subtitleColor = variant === 'dark' ? 'text-slate-500' : 'text-slate-300';
  
  // Logo azul (fundo escuro) para tela de login
  // Logo clara (fundo branco) para sidebar/tela principal
  const logoSrc = variant === 'light' ? '/logo-dark.png' : '/logo-light.png';

  return (
    <div className={cn('flex items-center', styles.gap, className)}>
      <img
        src={logoSrc}
        alt="Forbiz & GetWork"
        className={cn('object-contain', styles.logo)}
      />
      {showText && (
        <div className="leading-tight">
          <div className={cn('font-semibold tracking-wide uppercase', styles.title, titleColor)}>
            Forbiz &amp; GetWork
          </div>
          <div className={cn('font-medium', styles.subtitle, subtitleColor)}>
            Central de Ferramentas
          </div>
        </div>
      )}
    </div>
  );
}
