import React from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Home } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
        <FolderKanban className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
        404
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        Oops! The page or project resource you are looking for does not exist.
      </p>
      <Link to="/dashboard">
        <Button icon={Home}>Back to Dashboard</Button>
      </Link>
    </div>
  );
};
