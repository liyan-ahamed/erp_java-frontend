import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  contextArea?: ReactNode;
  maxWidth?: 'max-w-6xl' | 'max-w-7xl' | 'max-w-full';
  rawLayout?: boolean;
}

export const PageContainer = ({ 
  children, 
  title, 
  description, 
  actions, 
  contextArea,
  maxWidth = 'max-w-7xl',
  rawLayout = true 
}: PageContainerProps) => {
  
  const headerContent = (title || description || actions) && (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        {title && <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>}
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center space-x-3">{actions}</div>}
    </div>
  );

  if (rawLayout) {
    return (
      <div className={`w-full mx-auto ${maxWidth} flex flex-col`}>
        {/* We keep header content just in case pages pass specific actions, though Header.tsx also shows the page title */}
        {headerContent}
        {contextArea && (
          <div className="mb-6 w-full">
            {contextArea}
          </div>
        )}
        <div className="w-full flex-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full mx-auto ${maxWidth} flex flex-col`}>
      {headerContent}
      {contextArea && (
        <div className="mb-6 w-full">
          {contextArea}
        </div>
      )}
      <div className="flex-1 w-full bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] border border-gray-200 p-6 md:p-8">
        {children}
      </div>
    </div>
  );
};

