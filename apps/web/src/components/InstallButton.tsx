import React from 'react';
import { Download } from 'lucide-react';
import { CWS_URL } from '../lib/links';

interface InstallButtonProps {
  className?: string;
  label?: string;
}

/**
 * Primary acquisition CTA — links straight to the live Chrome Web Store
 * listing. Replaced the pre-launch WaitlistForm at publication.
 */
export const InstallButton: React.FC<InstallButtonProps> = ({
  className = '',
  label = 'Add to Chrome — Free',
}) => (
  <a
    href={CWS_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`btn-primary inline-flex items-center justify-center gap-2 py-2.5 px-5 ${className}`}
  >
    <Download className="w-4 h-4" />
    <span>{label}</span>
  </a>
);
