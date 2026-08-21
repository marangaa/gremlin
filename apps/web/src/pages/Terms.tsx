import React from 'react';
import { DocLayout, type DocSection } from '../components/DocLayout';

const sections: DocSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to terms',
    body: (
      <p>
        By installing, downloading, or using the Gremlin browser extension and companion
        services, you agree to these simple terms. If you disagree with any part, you may
        freely uninstall the extension at any time.
      </p>
    ),
  },
  {
    id: 'billing',
    title: 'Subscriptions & billing',
    body: (
      <p>
        Gremlin provides a free BYOK (Bring Your Own Key) tier and optional paid Pro plans.
        Pro subscriptions renew monthly until cancelled. You can easily cancel at any time from your
        account dashboard; your access will continue until the end of your billing cycle.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Fair use',
    body: (
      <p>
        Gremlin is designed to help humans focus. Please do not abuse API limits, attempt to
        disrupt cloud services, or conduct automated attacks on our servers.
      </p>
    ),
  },
  {
    id: 'warranty',
    title: 'Companion disclaimer',
    body: (
      <p>
        Gremlin provides focus companionship and humorous accountability on an “as-is” basis.
        While companions aim to give accurate and witty advice, their roasts and remarks are for
        entertainment and motivation.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Questions?',
    body: (
      <p>
        For any billing inquiries, feature ideas, or support requests, please contact us at{' '}
        <a href="mailto:rchdmaranga@gmail.com" className="text-accent hover:underline font-mono">
          rchdmaranga@gmail.com
        </a>{' '}
        or tweet us at{' '}
        <a href="https://x.com/rmarangaa" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-mono">
          @rmarangaa
        </a>.
      </p>
    ),
  },
];

export const Terms: React.FC = () => (
  <DocLayout
    eyebrow="Legal"
    title="Terms of service"
    updated="August 21, 2026"
    sections={sections}
  />
);
