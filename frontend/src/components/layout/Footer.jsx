import React from 'react';
import { ArrowRight, Mail, MapPin, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Sparkles size={18} className="text-indigo-600" />
              DOCUMIND-AI
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              An intelligent workspace for document discovery, search, collaboration, and AI-powered operations.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-indigo-600" />
                <a href="mailto:hello@documind.ai" className="hover:text-indigo-600">
                  hello@documind.ai
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} className="text-indigo-600" />
                <span>Pakistan</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Platform</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Document intelligence</li>
              <li>Knowledge sharing</li>
              <li>AI chat workflows</li>
              <li>Team analytics</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Stay updated</h3>
            <p className="mt-4 text-sm text-slate-600">
              Explore the latest features and product updates from the DOCUMIND-AI team.
            </p>
            <a href="#" className="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Learn more <ArrowRight size={16} className="ml-1" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} DOCUMIND-AI. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;