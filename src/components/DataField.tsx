import React from 'react';

interface DataFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const DataField: React.FC<DataFieldProps> = ({ children, className = '' }) => {
  return (
    <bdi dir="ltr" className={`font-sans ${className}`}>
      {children}
    </bdi>
  );
};
