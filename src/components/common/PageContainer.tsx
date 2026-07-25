import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  rawLayout?: boolean;
}

export const PageContainer = ({ children, title, description, actions, rawLayout = true }: PageContainerProps) => {
  if (rawLayout) {
    return (
      <div className="w-full space-y-6">
        {(title || actions) && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {title && <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>}
              {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center space-x-3">{actions}</div>}
          </div>
        )}
        <div className="w-full">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full space-y-6">
      {(title || actions) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {title && <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>}
            {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center space-x-3">{actions}</div>}
        </div>
      )}
      <div className="flex-1 w-full bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 p-6">
        {children}
      </div>
    </div>
  );
};

