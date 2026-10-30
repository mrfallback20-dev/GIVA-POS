import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  isDarkTheme?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  isDarkTheme = false,
}) => {
  const logoDimensions = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-10 h-10 sm:w-11 sm:h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const titleSizes = {
    sm: 'text-xs sm:text-sm font-black tracking-wider',
    md: 'text-sm sm:text-base font-black tracking-widest',
    lg: 'text-xl font-black tracking-widest',
    xl: 'text-2xl font-black tracking-widest',
  };

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2.5 shrink-0 ${className}`}>
      <div
        className={`${logoDimensions[size]} rounded-full overflow-hidden border-2 ${
          isDarkTheme ? 'border-amber-400/40' : 'border-[#E8D0D1]'
        } shadow-2xs shrink-0 bg-white flex items-center justify-center p-0.5`}
      >
        <img
          src="/assets/giva-logo.jpg"
          alt="GIVA Living & Baby Logo"
          className="w-full h-full object-cover rounded-full"
        />
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1 leading-none whitespace-nowrap">
          <span
            className={`uppercase font-black font-serif ${
              isDarkTheme ? 'text-amber-400' : 'text-[#4A352F]'
            } ${titleSizes[size]}`}
          >
            GIVA
          </span>
          <span
            className={`text-[8px] sm:text-[9px] font-extrabold tracking-wider uppercase px-1 py-0.5 rounded ${
              isDarkTheme
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                : 'text-[#BD7376] bg-[#FDF2F2] border border-[#F5D5D7]'
            }`}
          >
            LIVING
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`hidden sm:inline text-[11px] italic font-serif tracking-tight mt-0.5 truncate ${
              isDarkTheme ? 'text-stone-400' : 'text-[#785E5A]'
            }`}
          >
            For your Home. For your baby for His glory.
          </span>
        )}
      </div>
    </div>
  );
};
