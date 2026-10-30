import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const logoDimensions = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const titleSizes = {
    sm: 'text-sm font-black tracking-wider',
    md: 'text-base font-black tracking-widest',
    lg: 'text-xl font-black tracking-widest',
    xl: 'text-2xl font-black tracking-widest',
  };

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${className}`}>
      <div
        className={`${logoDimensions[size]} rounded-full overflow-hidden border-2 border-[#E8D0D1] shadow-2xs shrink-0 bg-white flex items-center justify-center p-0.5`}
      >
        <img
          src="/assets/giva-logo.jpg"
          alt="GIVA Living & Baby Logo"
          className="w-full h-full object-cover rounded-full"
        />
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 leading-none whitespace-nowrap">
          <span className={`text-[#4A352F] uppercase font-black tracking-widest font-serif ${titleSizes[size]}`}>
            GIVA
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#BD7376] tracking-widest uppercase bg-[#FDF2F2] border border-[#F5D5D7] px-1.5 py-0.5 rounded">
            LIVING & BABY
          </span>
        </div>
        {showSubtitle && (
          <span className="hidden sm:inline text-[11px] italic font-serif text-[#785E5A] tracking-tight mt-0.5 truncate">
            For your Home. For your baby for His glory.
          </span>
        )}
      </div>
    </div>
  );
};
