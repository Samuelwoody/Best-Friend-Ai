import type { PropsWithChildren } from 'react';

interface PageContainerProps extends PropsWithChildren {
  title: string;
  description: string;
}

export const PageContainer = ({
  title,
  description,
  children
}: PageContainerProps) => {
  return (
    <section className="page-card">
      <header className="page-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="page-body">{children}</div>
    </section>
  );
};
