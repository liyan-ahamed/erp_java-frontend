import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export const PageContainer = ({ children, title, description, actions }: PageContainerProps) => {
  return (
    <div className="flex flex-col w-full h-full min-h-screen p-6 md:p-8 space-y-6">
      {(title || actions) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center space-x-3">{actions}</div>}
        </div>
      )}
      <div className="flex-1 w-full bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {children}
      </div>
    </div>
  );
};
